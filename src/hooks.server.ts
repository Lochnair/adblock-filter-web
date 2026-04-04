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

export const handle: Handle = async ({ event, resolve }) => {
	if (!migrated && event.platform?.env?.RUN_MIGRATIONS === 'true') {
		const db = getDB(event.platform);
		await migrate(db, { migrationsFolder: './drizzle/migrations' });
		migrated = true;
	}

	if (event.url.pathname.startsWith('/filter/')) {
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
		event.platform?.context?.waitUntil(
			db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, key.id)).run()
		);
	}

	return resolve(event);
};
