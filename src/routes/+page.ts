import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const slug = url.searchParams.get('list') ?? 'default';
	const [listsRes, recordsRes] = await Promise.all([
		fetch('/api/lists'),
		fetch(`/api/records?list=${slug}`)
	]);
	const lists = await listsRes.json();
	const records = await recordsRes.json();
	return { lists, records, selectedList: slug };
};
