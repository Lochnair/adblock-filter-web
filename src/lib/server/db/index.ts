import { drizzle } from 'drizzle-orm/d1';

export function getDB(platform: App.Platform | Readonly<App.Platform> | undefined) {
	if (!platform?.env?.DB) {
		throw new Error('DB binding is not available');
	}

	return drizzle(platform.env.DB);
}
