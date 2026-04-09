// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { D1Database, CfProperties, ExecutionContext } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			cfAccessAuthenticated: boolean;
		}
		interface Platform {
			env?: {
				DB: D1Database;
				RUN_MIGRATIONS?: string;
				CF_ACCESS_TEAM_DOMAIN?: string;
				CF_ACCESS_AUD?: string;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
