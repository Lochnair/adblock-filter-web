// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { D1Database, CfProperties, ExecutionContext } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env?: {
				DB: D1Database;
				RUN_MIGRATIONS?: string;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
