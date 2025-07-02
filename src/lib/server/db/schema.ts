import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

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
