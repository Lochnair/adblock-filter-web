import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function getListId(db: ReturnType<typeof getDB>, slug: string) {
	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, slug)).all();
	if (!list) throw new Error('list not found');
	return list.id as number;
}

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const slug = url.searchParams.get('list') ?? 'default';
	const listId = await getListId(db, slug);
	const records = await db.select().from(dnsRecords).where(eq(dnsRecords.listId, listId)).all();
	return json(records);
}

export async function POST({ request, platform }) {
	const data = await request.json();
	const db = getDB(platform);
	const slug = data.list ?? 'default';
	const listId = await getListId(db, slug);
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
