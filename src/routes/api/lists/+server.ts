import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { filterLists, dnsRecords } from '$lib/server/db/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq, asc, sql } from 'drizzle-orm';

export async function GET({ platform }) {
	const db = getDB(platform);
	const lists = await db
		.select()
		.from(filterLists)
		.orderBy(asc(filterLists.position), asc(filterLists.slug))
		.all();
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
	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(filterLists).all();
	await db.insert(filterLists).values({ slug: data.slug, position: count + 1 });
	return new Response(null, { status: 201 });
}

export async function PATCH({ request, platform }) {
	const data = (await request.json()) as { slugs?: string[] };
	if (!Array.isArray(data.slugs) || data.slugs.length === 0) {
		return new Response('slugs required', { status: 400 });
	}
	const db = getDB(platform);
	await Promise.all(
		data.slugs.map((slug, i) =>
			db
				.update(filterLists)
				.set({ position: i + 1 })
				.where(eq(filterLists.slug, slug))
				.run()
		)
	);
	return new Response(null, { status: 204 });
}
