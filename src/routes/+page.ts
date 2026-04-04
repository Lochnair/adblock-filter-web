import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const slug = url.searchParams.get('list') ?? 'default';
	const [listsRes, recordsRes, sitesRes, keysRes] = await Promise.all([
		fetch('/api/lists'),
		fetch(`/api/records?list=${slug}`),
		fetch('/api/sites'),
		fetch('/api/keys')
	]);
	const lists = await listsRes.json();
	const records = await recordsRes.json();
	const sites = await sitesRes.json();
	const keys = await keysRes.json();
	return { lists, records, selectedList: slug, sites, keys };
};
