import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const filterLists = sqliteTable('filter_lists', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique()
});

export const dnsRecords = sqliteTable('dns_records', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	listId: integer('list_id')
		.notNull()
		.references(() => filterLists.id),
	name: text('name').notNull(),
	type: text('type').notNull(),
	value: text('value').notNull()
});

export const sites = sqliteTable('sites', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	description: text('description').notNull().default('')
});

export const siteLists = sqliteTable(
	'site_lists',
	{
		siteId: integer('site_id')
			.notNull()
			.references(() => sites.id),
		listId: integer('list_id')
			.notNull()
			.references(() => filterLists.id)
	},
	(t) => ({ pk: primaryKey({ columns: [t.siteId, t.listId] }) })
);
