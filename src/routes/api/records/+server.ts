import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { eq, and, ne } from 'drizzle-orm';
import { validateRecord } from '$lib/validation';

type RecordRow = InferSelectModel<typeof dnsRecords>;

async function getListId(db: ReturnType<typeof getDB>, slug: string) {
	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, slug)).all();
	return list?.id as number | undefined;
}

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const slug = url.searchParams.get('list') ?? 'default';
	const listId = await getListId(db, slug);
	if (listId === undefined) {
		return json([]);
	}
	const records = await db.select().from(dnsRecords).where(eq(dnsRecords.listId, listId)).all();
	return json(records);
}

export async function POST({ request, platform }) {
	const data = (await request.json()) as Partial<RecordRow> & { list?: string };
	const error = validateRecord({
		name: data.name as string,
		type: data.type as string,
		value: data.value as string
	});
	if (error) {
		return new Response(error, { status: 400 });
	}
	const db = getDB(platform);
	const slug = data.list ?? 'default';
	const listId = await getListId(db, slug);
	if (!listId) {
		return new Response('list not found', { status: 404 });
	}
	const dup = await db
		.select()
		.from(dnsRecords)
		.where(
			and(
				eq(dnsRecords.listId, listId),
				eq(dnsRecords.name, data.name as string),
				eq(dnsRecords.type, data.type as string),
				eq(dnsRecords.value, data.value as string)
			)
		)
		.all();
	if (dup.length) {
		return new Response('duplicate record', { status: 409 });
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
	const res = await db.delete(dnsRecords).where(eq(dnsRecords.id, id)).run();
	if (res.meta.changes === 0) {
		return new Response('not found', { status: 404 });
	}
	return new Response(null, { status: 204 });
}

export async function PUT({ request, platform }) {
	const data = (await request.json()) as Partial<RecordRow>;
	if (!data.id) {
		return new Response('missing fields', { status: 400 });
	}
	const error = validateRecord({
		name: data.name as string,
		type: data.type as string,
		value: data.value as string
	});
	if (error) {
		return new Response(error, { status: 400 });
	}
	const db = getDB(platform);
	const [rec] = await db.select().from(dnsRecords).where(eq(dnsRecords.id, data.id)).all();
	if (!rec) {
		return new Response('not found', { status: 404 });
	}
	const dup = await db
		.select()
		.from(dnsRecords)
		.where(
			and(
				eq(dnsRecords.listId, rec.listId),
				eq(dnsRecords.name, data.name as string),
				eq(dnsRecords.type, data.type as string),
				eq(dnsRecords.value, data.value as string),
				ne(dnsRecords.id, data.id)
			)
		)
		.all();
	if (dup.length) {
		return new Response('duplicate record', { status: 409 });
	}
	await db
		.update(dnsRecords)
		.set({ name: data.name, type: data.type, value: data.value })
		.where(eq(dnsRecords.id, data.id))
		.run();
	return new Response(null, { status: 200 });
}
