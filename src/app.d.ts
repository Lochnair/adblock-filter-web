// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {
	R2Bucket,
	D1Database,
	CfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env?: {
				BUCKET: R2Bucket;
				DB: D1Database;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
