import { drizzle } from 'drizzle-orm/d1';

export async function getDB() {
       if (!platform.env.DB) {
              throw new Error('DB binding is not available');
       }

       return drizzle(platform.env.DB);
}