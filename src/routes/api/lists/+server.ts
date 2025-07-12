import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { filterLists, dnsRecords } from '$lib/server/db/schema';
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
	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, data.slug)).all();
	if (!list) {
		return new Response('not found', { status: 404 });
	}
	await db.delete(dnsRecords).where(eq(dnsRecords.listId, list.id)).run();
	await db.delete(filterLists).where(eq(filterLists.id, list.id)).run();
	return new Response(null, { status: 204 });
}

export async function POST({ request, platform }) {
	const data = (await request.json()) as Partial<InferInsertModel<typeof filterLists>>;
	if (!data.slug) {
		return new Response('slug required', { status: 400 });
	}
	const db = getDB(platform);
	const [existing] = await db
		.select()
		.from(filterLists)
		.where(eq(filterLists.slug, data.slug))
		.all();
	if (existing) {
		return new Response('duplicate slug', { status: 409 });
	}
	await db.insert(filterLists).values({ slug: data.slug });
	return new Response(null, { status: 201 });
}
