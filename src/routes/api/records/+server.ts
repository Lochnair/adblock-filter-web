import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ platform }) {
	const db = getDB(platform);
	const records = await db.select().from(dnsRecords).all();
	return json(records);
}

export async function POST({ request, platform }) {
	const data = await request.json();
	const db = getDB(platform);
	await db.insert(dnsRecords).values({
		name: data.name,
		type: data.type,
		value: data.value
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
