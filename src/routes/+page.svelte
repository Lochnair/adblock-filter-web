<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Pencil, Trash2, X, Plus, Globe, Key, Upload, GripVertical, ArrowDownAZ, ListFilter } from 'lucide-svelte';
	import { typeBadgeClass } from '$lib/badge-utils';
	import RecordModal from '$lib/components/RecordModal.svelte';
	import ListModal from '$lib/components/ListModal.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';
	import SiteModal from '$lib/components/SiteModal.svelte';
	import SiteEditor from '$lib/components/SiteEditor.svelte';
	import KeyModal from '$lib/components/KeyModal.svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import type { InferSelectModel } from 'drizzle-orm';
	import type { filterLists as filterListsTable } from '$lib/server/db/schema';
	import { DNS_RR_TYPES } from '$lib/record-types';
	import { resolve } from '$app/paths';

	type FilterList = InferSelectModel<typeof filterListsTable>;

	type SiteRow = { id: number; slug: string; description: string; lists: string[]; position: number };
	type ApiKey = { id: number; name: string; createdAt: number; lastUsedAt: number | null };

	let { data } = $props<{
		data: {
			lists: FilterList[];
			records: DNSRecord[];
			selectedList: string;
			sites: SiteRow[];
			keys: ApiKey[];
		};
	}>();

	// ── Lists state ──────────────────────────────────────────────────────────
	let lists = $state<FilterList[]>(data.lists);
	let selectedList = $state(data.selectedList);
	const initialRecords: Record<string, DNSRecord[]> = {};
	initialRecords[data.selectedList] = data.records;
	let recordsByList = $state<Record<string, DNSRecord[]>>(initialRecords);
	let modalOpen = $state(false);
	let listModalOpen = $state(false);
	let importModalOpen = $state(false);
	let editing: DNSRecord | null = $state(null);
	let modalInitialName = $state('');
	let recordError = $state('');

	// ── Sites state ──────────────────────────────────────────────────────────
	let sites = $state<SiteRow[]>(data.sites);
	let siteModalOpen = $state(false);
	let siteEditorOpen = $state(false);
	let editingSite: SiteRow | null = $state(null);

	// ── API Keys state ────────────────────────────────────────────────────────
	let keys = $state<ApiKey[]>(data.keys);
	let keyModalOpen = $state(false);

	// ── Top-level section ────────────────────────────────────────────────────
	let section = $state<'lists' | 'sites' | 'keys'>('lists');

	// ── Sort / DnD ───────────────────────────────────────────────────────────
	let listSortMode = $state<'manual' | 'alpha'>('manual');
	let siteSortMode = $state<'manual' | 'alpha'>('manual');

	let displayedLists = $derived(
		listSortMode === 'alpha' ? [...lists].sort((a, b) => a.slug.localeCompare(b.slug)) : lists
	);
	let displayedSites = $derived(
		siteSortMode === 'alpha' ? [...sites].sort((a, b) => a.slug.localeCompare(b.slug)) : sites
	);

	let listDragSrc = $state<number | null>(null);
	let listDragOver = $state<number | null>(null);
	let siteDragSrc = $state<number | null>(null);
	let siteDragOver = $state<number | null>(null);

	function onListDragStart(i: number) {
		listDragSrc = i;
	}
	function onListDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		listDragOver = i;
	}
	function onListDragLeave() {
		listDragOver = null;
	}
	function onListDragEnd() {
		listDragSrc = null;
		listDragOver = null;
	}
	async function onListDrop(dropIndex: number) {
		if (listDragSrc === null || listDragSrc === dropIndex) {
			onListDragEnd();
			return;
		}
		const reordered = [...lists];
		const [moved] = reordered.splice(listDragSrc, 1);
		reordered.splice(dropIndex, 0, moved);
		lists = reordered;
		listDragSrc = null;
		listDragOver = null;
		await fetch('/api/lists', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slugs: reordered.map((l) => l.slug) })
		});
	}

	function onSiteDragStart(i: number) {
		siteDragSrc = i;
	}
	function onSiteDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		siteDragOver = i;
	}
	function onSiteDragLeave() {
		siteDragOver = null;
	}
	function onSiteDragEnd() {
		siteDragSrc = null;
		siteDragOver = null;
	}
	async function onSiteDrop(dropIndex: number) {
		if (siteDragSrc === null || siteDragSrc === dropIndex) {
			onSiteDragEnd();
			return;
		}
		const reordered = [...sites];
		const [moved] = reordered.splice(siteDragSrc, 1);
		reordered.splice(dropIndex, 0, moved);
		sites = reordered;
		siteDragSrc = null;
		siteDragOver = null;
		await fetch('/api/sites', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slugs: reordered.map((s) => s.slug) })
		});
	}

	// ── List helpers ─────────────────────────────────────────────────────────
	function openCreate(hostname = '') {
		editing = null;
		recordError = '';
		modalInitialName = hostname;
		modalOpen = true;
	}

	function openEdit(record: DNSRecord) {
		editing = record;
		recordError = '';
		modalInitialName = '';
		modalOpen = true;
	}

	async function removeRecord(id: number) {
		if (!confirm('Delete this record?')) return;
		await fetch(`/api/records?id=${id}`, { method: 'DELETE' });
		await refreshLists();
	}

	async function refreshLists() {
		const [listRes, recordRes] = await Promise.all([
			fetch('/api/lists'),
			fetch(`/api/records?list=${selectedList}`)
		]);
		lists = await listRes.json();
		recordsByList = { ...recordsByList, [selectedList]: await recordRes.json() };
	}

	async function loadRecords(slug: string) {
		if (recordsByList[slug]) return;
		const res = await fetch(`/api/records?list=${slug}`);
		recordsByList = { ...recordsByList, [slug]: await res.json() };
	}

	function changeTab(slug: string) {
		selectedList = slug;
		loadRecords(slug);
	}

	async function removeList(slug: string) {
		if (!confirm('Delete this list and all its records?')) return;
		await fetch('/api/lists', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug })
		});
		delete recordsByList[slug];
		await refreshLists();
		if (selectedList === slug && lists.length) {
			selectedList = lists[0].slug;
			loadRecords(selectedList);
		}
	}

	// ── Grouping helpers ─────────────────────────────────────────────────────
	const dnsRRSet = new Set<string>(DNS_RR_TYPES);

	function groupByHostname(records: DNSRecord[]): [string, DNSRecord[]][] {
		const groups: Record<string, DNSRecord[]> = {};
		for (const r of records) {
			(groups[r.name] ??= []).push(r);
		}
		return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
	}

	function autoBlockedTypes(recs: DNSRecord[]): string[] {
		// Only emit when there are real RR-type records (mirrors generateFilter logic)
		const rrRecs = recs.filter((r) => dnsRRSet.has(r.type));
		if (rrRecs.length === 0) return [];
		const covered = new Set<string>([
			...rrRecs.map((r) => r.type),
			...recs
				.filter((r) => (r.type === 'NXDOMAIN' || r.type === 'REFUSED') && r.value)
				.map((r) => r.value),
			'SOA'
		]);
		return DNS_RR_TYPES.filter((t) => !covered.has(t));
	}

	// ── Key helpers ───────────────────────────────────────────────────────────
	async function refreshKeys() {
		const res = await fetch('/api/keys');
		keys = await res.json();
	}

	async function revokeKey(id: number) {
		if (!confirm('Revoke this key? Any AdGuard Home instance using it will lose access.')) return;
		await fetch('/api/keys', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		await refreshKeys();
	}

	function formatDate(ts: number | null) {
		if (!ts) return '—';
		return new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' });
	}

	// ── Site helpers ──────────────────────────────────────────────────────────
	async function refreshSites() {
		const res = await fetch('/api/sites');
		sites = await res.json();
	}

	async function removeSite(slug: string) {
		if (!confirm(`Delete site "${slug}" and its list assignments?`)) return;
		await fetch('/api/sites', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug })
		});
		await refreshSites();
	}

	function openSiteEditor(site: SiteRow) {
		editingSite = site;
		siteEditorOpen = true;
	}
</script>

<!-- Section switcher -->
<div class="mx-auto max-w-6xl px-4 pt-4">
	<div class="mb-6 flex gap-1.5">
		{#each ([['lists', 'Filter Lists'], ['sites', 'Sites'], ['keys', 'API Keys']] as const) as [id, label]}
			<button
				class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors
					{section === id
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}"
				onclick={() => (section = id)}
			>
				{label}
				{#if id === 'sites' && sites.length > 0}
					<span
						class="rounded-full px-1.5 py-0.5 text-xs
						{section === 'sites'
							? 'bg-primary-foreground/20 text-primary-foreground'
							: 'bg-background text-muted-foreground'}"
					>{sites.length}</span>
				{/if}
				{#if id === 'keys' && keys.length > 0}
					<span
						class="rounded-full px-1.5 py-0.5 text-xs
						{section === 'keys'
							? 'bg-primary-foreground/20 text-primary-foreground'
							: 'bg-background text-muted-foreground'}"
					>{keys.length}</span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<!-- ─────────────────────── LISTS SECTION ─────────────────────── -->
{#if section === 'lists'}
	<div class="mx-auto max-w-6xl p-4">
		{#if lists.length === 0}
			<div class="border-border rounded-lg border border-dashed py-14 text-center">
				<ListFilter class="text-muted-foreground mx-auto mb-3 h-8 w-8" />
				<p class="text-foreground mb-1 text-sm font-medium">No filter lists yet</p>
				<p class="text-muted-foreground mb-4 text-sm">
					Create a list to start managing DNS records.
				</p>
				<Button variant="outline" size="sm" onclick={() => (listModalOpen = true)}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />Create your first list
				</Button>
			</div>
		{:else}
		<Tabs.Root value={selectedList} onValueChange={changeTab}>
			<div class="mb-4 flex items-center gap-2">
				<Tabs.List class="h-auto flex-wrap gap-1">
					{#each displayedLists as l, i (l.id)}
						<div
							draggable={listSortMode === 'manual'}
							ondragstart={() => onListDragStart(i)}
							ondragover={(e) => onListDragOver(e, i)}
							ondragleave={onListDragLeave}
							ondrop={() => onListDrop(i)}
							ondragend={onListDragEnd}
							class="transition-opacity
								{listDragOver === i ? 'rounded ring-1 ring-primary opacity-50' : ''}
								{listDragSrc === i ? 'opacity-40' : ''}"
						>
							<Tabs.Trigger value={l.slug} class="gap-1">
								{l.slug}
								<button
									class="hover:bg-destructive/20 ml-1 rounded p-0.5"
									aria-label="Delete list"
									onclick={(e) => {
										e.stopPropagation();
										removeList(l.slug);
									}}
								>
									<X class="text-destructive h-3 w-3" />
								</button>
							</Tabs.Trigger>
						</div>
					{/each}
				</Tabs.List>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 shrink-0 {listSortMode === 'alpha' ? 'text-primary' : 'text-muted-foreground'}"
					aria-label={listSortMode === 'alpha' ? 'Switch to manual order' : 'Sort A→Z'}
					onclick={() => (listSortMode = listSortMode === 'alpha' ? 'manual' : 'alpha')}
				>
					<ArrowDownAZ class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8 shrink-0"
					aria-label="Create new list"
					onclick={() => (listModalOpen = true)}
				>
					<Plus class="h-4 w-4" />
				</Button>
			</div>

			{#each lists as l (l.id)}
				<Tabs.Content value={l.slug}>
					{@const records = recordsByList[l.slug] ?? []}
					{@const groups = groupByHostname(records)}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<p class="text-muted-foreground text-sm">
								{records.length}
								{records.length === 1 ? 'record' : 'records'}
							</p>
							<div class="flex gap-2">
								<Button variant="outline" onclick={() => (importModalOpen = true)}>
									<Upload class="mr-1.5 h-4 w-4" />Import
								</Button>
								<Button onclick={() => openCreate()}>Add Record</Button>
							</div>
						</div>

						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-28">Type</Table.Head>
									<Table.Head>Value</Table.Head>
									<Table.Head class="w-20"></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each groups as [hostname, recs] (hostname)}
									{@const blocked = autoBlockedTypes(recs)}
									<!-- Hostname group header -->
									<Table.Row class="bg-muted/40 hover:bg-muted/40 border-t">
										<Table.Cell colspan={2} class="py-2">
											<span class="font-mono text-sm font-semibold">{hostname}</span>
										</Table.Cell>
										<Table.Cell class="py-2">
											<div class="flex justify-end">
												<Button
													variant="ghost"
													size="icon"
													class="h-7 w-7"
													aria-label="Add record for {hostname}"
													onclick={() => openCreate(hostname)}
												>
													<Plus class="h-3.5 w-3.5" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
									<!-- Records -->
									{#each recs as r (r.id)}
										<Table.Row>
											<Table.Cell>
												<span
													class="rounded px-1.5 py-0.5 font-mono text-xs {typeBadgeClass(r.type)}"
												>{r.type}</span
												>
											</Table.Cell>
											<Table.Cell class="max-w-xs">
												{#if r.type === 'NXDOMAIN' || r.type === 'REFUSED'}
													{#if r.value}
														<span class="text-muted-foreground font-mono text-xs"
															>{r.value} only</span
														>
													{:else}
														<span class="text-destructive text-xs">all queries</span>
													{/if}
												{:else if !r.value}
													<span class="text-muted-foreground text-xs italic">no record</span>
												{:else}
													<span class="block truncate font-mono text-sm">{r.value}</span>
												{/if}
											</Table.Cell>
											<Table.Cell class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8"
													aria-label="Edit"
													onclick={() => openEdit(r)}
												>
													<Pencil class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													class="text-destructive hover:text-destructive h-8 w-8"
													aria-label="Delete"
													onclick={() => removeRecord(r.id)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</Table.Cell>
										</Table.Row>
									{/each}
									<!-- Auto-blocked types footer -->
									{#if blocked.length > 0}
										<Table.Row class="hover:bg-transparent">
											<Table.Cell colspan={3} class="border-b py-1.5 pb-2.5">
												<span class="text-muted-foreground text-xs">
													also blocks: {blocked.join(' · ')}
												</span>
											</Table.Cell>
										</Table.Row>
									{/if}
								{/each}
							</Table.Body>
						</Table.Root>

						<p class="text-muted-foreground text-sm">
							<a
								href={resolve(`/filter/${l.slug}.txt`)}
								class="text-primary underline underline-offset-4 hover:no-underline"
							>
								View generated filter for <span class="font-mono">{l.slug}</span>
							</a>
						</p>
					</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
		{/if}
	</div>
{/if}

<!-- ─────────────────────── SITES SECTION ─────────────────────── -->
{#if section === 'sites'}
	<div class="mx-auto max-w-6xl space-y-4 p-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">Sites</h2>
				<p class="text-muted-foreground text-sm">
					Each site merges its assigned lists into one filter URL.
				</p>
			</div>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="icon"
					class="h-9 w-9 {siteSortMode === 'alpha' ? 'border-primary' : ''}"
					aria-label={siteSortMode === 'alpha' ? 'Switch to manual order' : 'Sort A→Z'}
					onclick={() => (siteSortMode = siteSortMode === 'alpha' ? 'manual' : 'alpha')}
				>
					<ArrowDownAZ class="h-4 w-4" />
				</Button>
				<Button onclick={() => (siteModalOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					New Site
				</Button>
			</div>
		</div>

		{#if sites.length === 0}
			<div class="border-border rounded-lg border border-dashed py-14 text-center">
				<Globe class="text-muted-foreground mx-auto mb-3 h-8 w-8" />
				<p class="text-foreground mb-1 text-sm font-medium">No sites yet</p>
				<p class="text-muted-foreground mb-4 text-sm">
					Sites merge assigned filter lists into one URL.
				</p>
				<Button variant="outline" size="sm" onclick={() => (siteModalOpen = true)}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />Create your first site
				</Button>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						{#if siteSortMode === 'manual'}
							<Table.Head class="w-8"></Table.Head>
						{/if}
						<Table.Head>Site</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Assigned Lists</Table.Head>
						<Table.Head class="w-36">Filter URL</Table.Head>
						<Table.Head class="w-20"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each displayedSites as site, i (site.id)}
						<Table.Row
							draggable={siteSortMode === 'manual'}
							ondragstart={() => onSiteDragStart(i)}
							ondragover={(e) => onSiteDragOver(e, i)}
							ondragleave={onSiteDragLeave}
							ondrop={() => onSiteDrop(i)}
							ondragend={onSiteDragEnd}
							class="{siteDragOver === i ? 'bg-accent/60' : ''} {siteDragSrc === i ? 'opacity-40' : ''}"
						>
							{#if siteSortMode === 'manual'}
								<Table.Cell class="text-muted-foreground w-8 cursor-grab">
									<GripVertical class="h-4 w-4" />
								</Table.Cell>
							{/if}
							<Table.Cell class="font-mono text-sm font-medium">{site.slug}</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm"
								>{site.description || '—'}</Table.Cell
							>
							<Table.Cell>
								{#if site.lists.length === 0}
									<span class="text-muted-foreground text-xs">none</span>
								{:else}
									<div class="flex flex-wrap gap-1">
										{#each site.lists as l (l)}
											<Badge variant="secondary" class="font-mono text-xs">{l}</Badge>
										{/each}
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell class="max-w-[180px]">
								<a
									href={resolve(`/filter/site/${site.slug}.txt`)}
									target="_blank"
									class="text-primary flex items-center gap-1 font-mono text-xs underline underline-offset-2 hover:no-underline"
								>
									<Globe class="h-3 w-3 shrink-0" /><span class="truncate"
										>/filter/site/{site.slug}.txt</span
									>
								</a>
							</Table.Cell>
							<Table.Cell class="flex justify-end gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									aria-label="Edit site"
									onclick={() => openSiteEditor(site)}
								>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive h-8 w-8"
									aria-label="Delete site"
									onclick={() => removeSite(site.slug)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</div>
{/if}

<!-- ─────────────────────── KEYS SECTION ─────────────────────── -->
{#if section === 'keys'}
	<div class="mx-auto max-w-6xl space-y-4 p-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">API Keys</h2>
				<p class="text-muted-foreground text-sm">
					Keys authenticate AdGuard Home requests to filter URLs via <code
						class="bg-muted rounded px-1 text-xs">?token=&lt;key&gt;</code
					>.
				</p>
			</div>
			<Button onclick={() => (keyModalOpen = true)}>
				<Key class="mr-2 h-4 w-4" />
				New Key
			</Button>
		</div>

		{#if keys.length === 0}
			<div class="border-border rounded-lg border border-dashed py-14 text-center">
				<Key class="text-muted-foreground mx-auto mb-3 h-8 w-8" />
				<p class="text-foreground mb-1 text-sm font-medium">No API keys yet</p>
				<p class="text-muted-foreground mb-4 text-sm">
					Keys authenticate AdGuard Home requests via <code
						class="bg-muted rounded px-1 text-xs">?token=&lt;key&gt;</code
					>.
				</p>
				<Button variant="outline" size="sm" onclick={() => (keyModalOpen = true)}>
					<Key class="mr-1.5 h-3.5 w-3.5" />Generate a key
				</Button>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Last used</Table.Head>
						<Table.Head></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each keys as k (k.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{k.name}</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm"
								>{formatDate(k.createdAt)}</Table.Cell
							>
							<Table.Cell class="text-muted-foreground text-sm"
								>{formatDate(k.lastUsedAt)}</Table.Cell
							>
							<Table.Cell class="flex justify-end">
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive h-8 w-8"
									aria-label="Revoke key"
									onclick={() => revokeKey(k.id)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}

		<div
			class="bg-muted/50 border-border border-l-primary/30 space-y-1 rounded-lg border border-l-4 px-4 py-3.5"
		>
			<p class="text-sm font-medium">Cloudflare Access setup</p>
			<p class="text-muted-foreground text-sm">
				Add a <strong>Bypass</strong> policy in your Cloudflare Access application for the path
				<code class="bg-background rounded px-1 text-xs">/filter/*</code> so AdGuard Home can reach
				filter URLs without browser-based auth. The
				<code class="bg-background rounded px-1 text-xs">?token=</code> check above protects those routes
				instead.
			</p>
		</div>
	</div>
{/if}

<!-- ─────────────────────── MODALS ─────────────────────── -->
<RecordModal
	bind:open={modalOpen}
	record={editing}
	list={selectedList}
	initialName={modalInitialName}
	bind:error={recordError}
	afterSubmit={refreshLists}
/>

<ListModal bind:open={listModalOpen} afterSubmit={refreshLists} />

<ImportModal bind:open={importModalOpen} listSlug={selectedList} onimport={refreshLists} />

<SiteModal bind:open={siteModalOpen} afterSubmit={refreshSites} />

<SiteEditor
	bind:open={siteEditorOpen}
	bind:site={editingSite}
	availableLists={lists.map((l) => l.slug)}
	afterSubmit={refreshSites}
/>

<KeyModal bind:open={keyModalOpen} afterSubmit={refreshKeys} />
