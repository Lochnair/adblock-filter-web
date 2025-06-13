import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords } from '$lib/server/db/schema';

export async function GET({ request, platform }) {
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
