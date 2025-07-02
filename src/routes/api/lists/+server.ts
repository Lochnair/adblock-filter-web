import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { filterLists } from '$lib/server/db/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export async function GET({ platform }) {
	const db = getDB(platform);
	const lists = await db.select().from(filterLists).all();
	return json(lists);
}

export async function DELETE({ request, platform }) {
	const db = getDB(platform);
	const data = (await request.json()) as Partial<InferInsertModel<typeof filterLists>>;
	if (!data.slug) {
		return new Response('slug required', { status: 400 });
	}
	await db.delete(filterLists).where(eq(filterLists.slug, data.slug));
	return new Response(null, { status: 204 });
}

export async function POST({ request, platform }) {
	const data = (await request.json()) as Partial<InferInsertModel<typeof filterLists>>;
	if (!data.slug) {
		return new Response('slug required', { status: 400 });
	}
	const db = getDB(platform);
	await db.insert(filterLists).values({ slug: data.slug });
	return new Response(null, { status: 201 });
}
