import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const slug = url.searchParams.get('list') ?? 'default';
	const [listsRes, recordsRes, sitesRes] = await Promise.all([
		fetch('/api/lists'),
		fetch(`/api/records?list=${slug}`),
		fetch('/api/sites')
	]);
	const lists = await listsRes.json();
	const records = await recordsRes.json();
	const sites = await sitesRes.json();
	return { lists, records, selectedList: slug, sites };
};
