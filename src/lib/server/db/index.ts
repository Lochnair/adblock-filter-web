import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DB) {
       throw new Error('DB binding is not available');
}

export const db = drizzle(env.DB, { schema });
