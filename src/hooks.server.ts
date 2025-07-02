import type { Handle } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { migrate } from 'drizzle-orm/d1/migrator';

let migrated = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!migrated) {
		const db = getDB(event.platform);
		await migrate(db, { migrationsFolder: './drizzle/migrations' });
		migrated = true;
	}
	return resolve(event);
};
