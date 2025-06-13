import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dnsRecords } from '$lib/server/db/schema';

export async function GET() {
       const records = await db.select().from(dnsRecords).all();
       return json(records);
}

export async function POST({ request }) {
       const data = await request.json();
       await db.insert(dnsRecords).values({
               name: data.name,
               type: data.type,
               value: data.value
       });
       return new Response(null, { status: 201 });
}
