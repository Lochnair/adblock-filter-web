import { getDB } from '$lib/server/db';
import { sites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/** PATCH /api/sites/[slug] — update site metadata (description) */
export async function PATCH({ params, request, platform }) {
	const db = getDB(platform);
	const [site] = await db.select().from(sites).where(eq(sites.slug, params.slug)).all();
	if (!site) {
		return new Response('site not found', { status: 404 });
	}
	const data = (await request.json()) as { description?: string };
	await db
		.update(sites)
		.set({ description: data.description ?? '' })
		.where(eq(sites.id, site.id))
		.run();
	return new Response(null, { status: 204 });
}
