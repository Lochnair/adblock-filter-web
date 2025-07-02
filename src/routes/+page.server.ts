import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = getDB(platform);
	const slug = url.searchParams.get('list') ?? 'default';
	const lists = await db.select().from(filterLists).all();
	const [list] = lists.filter((l) => l.slug === slug);
	let records = [] as InferSelectModel<typeof dnsRecords>[];
	if (list) {
		records = await db.select().from(dnsRecords).where(eq(dnsRecords.listId, list.id)).all();
	}
	return { lists, records, selectedList: slug };
};

export const actions: Actions = {
	createList: async ({ request, platform }) => {
		const data = await request.formData();
		const slug = data.get('slug');
		if (typeof slug !== 'string' || !slug) {
			return new Response('slug required', { status: 400 });
		}
		const db = getDB(platform);
		await db.insert(filterLists).values({ slug });
		return { success: true };
	},
	saveRecord: async ({ request, platform }) => {
		const data = await request.formData();
		const id = data.get('id');
		const name = data.get('name');
		const type = data.get('type');
		const value = data.get('value');
		const list = (data.get('list') as string) ?? 'default';
		if (typeof name !== 'string' || typeof type !== 'string' || typeof value !== 'string') {
			return new Response('invalid data', { status: 400 });
		}
		const db = getDB(platform);
		const [listRow] = await db.select().from(filterLists).where(eq(filterLists.slug, list)).all();
		if (!listRow) return new Response('list not found', { status: 404 });
		if (id) {
			await db
				.update(dnsRecords)
				.set({ name, type, value })
				.where(eq(dnsRecords.id, Number(id)))
				.run();
		} else {
			await db.insert(dnsRecords).values({ name, type, value, listId: listRow.id });
		}
		return { success: true };
	},
	deleteRecord: async ({ request, platform }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return new Response('id required', { status: 400 });
		const db = getDB(platform);
		await db.delete(dnsRecords).where(eq(dnsRecords.id, id)).run();
		return { success: true };
	}
};
