import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function hashKey(key: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function generateKey(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `adblock_${hex}`;
}

/** GET /api/keys — list all keys (never returns the hash) */
export async function GET({ platform }) {
	const db = getDB(platform);
	const rows = await db
		.select({ id: apiKeys.id, name: apiKeys.name, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt })
		.from(apiKeys)
		.all();
	return json(rows);
}

/** POST /api/keys — create a new key, returns plaintext key once */
export async function POST({ request, platform }) {
	const data = (await request.json()) as { name?: string };
	if (!data.name?.trim()) {
		return new Response('name required', { status: 400 });
	}
	const key = generateKey();
	const hash = await hashKey(key);
	const db = getDB(platform);
	await db.insert(apiKeys).values({
		name: data.name.trim(),
		keyHash: hash,
		createdAt: Date.now()
	});
	return json({ key }, { status: 201 });
}

/** DELETE /api/keys — revoke a key by id */
export async function DELETE({ request, platform }) {
	const data = (await request.json()) as { id?: number };
	if (!data.id) {
		return new Response('id required', { status: 400 });
	}
	const db = getDB(platform);
	const res = await db.delete(apiKeys).where(eq(apiKeys.id, data.id)).run();
	if (res.meta.changes === 0) {
		return new Response('not found', { status: 404 });
	}
	return new Response(null, { status: 204 });
}
