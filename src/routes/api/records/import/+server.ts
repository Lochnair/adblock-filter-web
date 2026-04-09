import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateRecord } from '$lib/validation';
import { parseFilterRules } from '$lib/filterParser';
import type { RecordType } from '$lib/record-types';

export async function POST({ request, platform }) {
	const body = (await request.json()) as { listSlug?: string; rules?: string };
	if (!body.listSlug || typeof body.rules !== 'string') {
		return new Response('missing fields', { status: 400 });
	}

	const db = getDB(platform);
	const [list] = await db
		.select()
		.from(filterLists)
		.where(eq(filterLists.slug, body.listSlug))
		.all();
	if (!list) {
		return new Response('list not found', { status: 404 });
	}

	const { records: parsed, skipped: unrecognized } = parseFilterRules(body.rules);

	// Fetch existing records once for duplicate checking
	const existing = await db
		.select()
		.from(dnsRecords)
		.where(eq(dnsRecords.listId, list.id))
		.all();
	const existingSet = new Set(existing.map((r) => `${r.name}\0${r.type}\0${r.value}`));

	let imported = 0;
	let duplicate = 0;
	let invalid = 0;
	const errors: string[] = [];

	for (const rec of parsed) {
		const err = validateRecord({
			name: rec.name,
			type: rec.type as RecordType,
			value: rec.value
		});
		if (err) {
			invalid++;
			errors.push(`${rec.name} ${rec.type} ${rec.value}: ${err}`);
			continue;
		}

		const key = `${rec.name}\0${rec.type}\0${rec.value}`;
		if (existingSet.has(key)) {
			duplicate++;
			continue;
		}

		await db.insert(dnsRecords).values({
			name: rec.name,
			type: rec.type as RecordType,
			value: rec.value,
			listId: list.id
		});
		existingSet.add(key);
		imported++;
	}

	return json({ imported, duplicate, invalid, unrecognized, errors });
}
