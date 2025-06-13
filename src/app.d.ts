// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
        interface Platform {
            env?: {
				BUCKET: R2Bucket;
				DB: D1Database;
			};
            cf: CfProperties
            ctx: ExecutionContext
        }
    }
}

export {};