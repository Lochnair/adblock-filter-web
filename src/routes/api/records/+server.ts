import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function getListId(db: ReturnType<typeof getDB>, slug: string) {
	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, slug)).all();
	return list?.id as number | undefined;
}

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const slug = url.searchParams.get('list') ?? 'default';
	const listId = await getListId(db, slug);
	if (!listId) {
		return json([]);
	}
	const records = await db.select().from(dnsRecords).where(eq(dnsRecords.listId, listId)).all();
	return json(records);
}

export async function POST({ request, platform }) {
	const data = await request.json();
	const db = getDB(platform);
	const slug = data.list ?? 'default';
	const listId = await getListId(db, slug);
	if (!listId) {
		return new Response('list not found', { status: 404 });
	}
	await db.insert(dnsRecords).values({
		name: data.name,
		type: data.type,
		value: data.value,
		listId
	});
	return new Response(null, { status: 201 });
}

export async function DELETE({ url, platform }) {
	const id = Number(url.searchParams.get('id'));
	if (!id) {
		return new Response('id required', { status: 400 });
	}
	const db = getDB(platform);
	await db.delete(dnsRecords).where(eq(dnsRecords.id, id)).run();
	return new Response(null, { status: 200 });
}

export async function PUT({ request, platform }) {
	const data = await request.json();
	if (!data.id) {
		return new Response('id required', { status: 400 });
	}
	const db = getDB(platform);
	await db
		.update(dnsRecords)
		.set({ name: data.name, type: data.type, value: data.value })
		.where(eq(dnsRecords.id, data.id))
		.run();
	return new Response(null, { status: 200 });
}
