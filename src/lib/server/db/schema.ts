import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const dnsRecords = sqliteTable('dns_records', {
       id: integer('id').primaryKey({ autoIncrement: true }),
       name: text('name').notNull(),
       type: text('type').notNull(),
       value: text('value').notNull()
});
