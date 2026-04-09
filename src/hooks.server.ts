import type { Handle } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { migrate } from 'drizzle-orm/d1/migrator';
import { apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

let migrated = false;

async function hashKey(key: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function b64urlDecode(s: string): string {
	return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

async function validateCFAccessJWT(jwt: string, teamDomain: string, aud: string): Promise<boolean> {
	try {
		const parts = jwt.split('.');
		if (parts.length !== 3) return false;
		const [headerB64, payloadB64, signatureB64] = parts;

		const header = JSON.parse(b64urlDecode(headerB64));
		const payload = JSON.parse(b64urlDecode(payloadB64));

		if (payload.exp < Math.floor(Date.now() / 1000)) return false;

		const audList: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
		if (!audList.includes(aud)) return false;

		const certsRes = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
		if (!certsRes.ok) return false;
		const certs = (await certsRes.json()) as { keys: JsonWebKey[] };

		const jwk = certs.keys?.find((k) => (k as { kid?: string }).kid === header.kid);
		if (!jwk) return false;

		const key = await crypto.subtle.importKey(
			'jwk',
			jwk,
			{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
			false,
			['verify']
		);

		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const sig = Uint8Array.from(b64urlDecode(signatureB64), (c) => c.charCodeAt(0));

		return await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sig, data);
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!migrated && event.platform?.env?.RUN_MIGRATIONS === 'true') {
		const db = getDB(event.platform);
		await migrate(db, { migrationsFolder: './drizzle/migrations' });
		migrated = true;
	}

	const teamDomain = event.platform?.env?.CF_ACCESS_TEAM_DOMAIN;
	const cfAud = event.platform?.env?.CF_ACCESS_AUD;

	// CF Access injects the header on protected paths; on bypassed paths (e.g. /filter/*)
	// authenticated users still carry the CF_Authorization cookie which holds the same JWT.
	const cookieHeader = event.request.headers.get('cookie') ?? '';
	const cfCookie = cookieHeader.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
	const jwt =
		event.request.headers.get('CF-Access-Jwt-Assertion') ?? cfCookie ?? null;

	event.locals.cfAccessAuthenticated =
		teamDomain && cfAud && jwt
			? await validateCFAccessJWT(jwt, teamDomain, cfAud)
			: false;

	if (event.url.pathname.startsWith('/filter/')) {
		if (event.locals.cfAccessAuthenticated) return resolve(event);

		const token = event.url.searchParams.get('token');
		if (!token) {
			return new Response('Unauthorized', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Bearer realm="filter"' }
			});
		}

		let db;
		try {
			db = getDB(event.platform);
		} catch {
			// No DB available (local dev without wrangler) — allow through
			return resolve(event);
		}

		const hash = await hashKey(token);
		const [key] = await db
			.select({ id: apiKeys.id })
			.from(apiKeys)
			.where(eq(apiKeys.keyHash, hash))
			.all();
		if (!key) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Update last_used_at — fire and forget
		event.platform?.ctx?.waitUntil(
			db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, key.id)).run()
		);
	} else if (!event.locals.cfAccessAuthenticated) {
		return new Response('Forbidden', { status: 403 });
	}

	return resolve(event);
};
