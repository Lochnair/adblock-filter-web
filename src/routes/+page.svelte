<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Pencil, Trash2, X, Plus, Globe, Key } from 'lucide-svelte';
	import RecordModal from '$lib/components/RecordModal.svelte';
	import ListModal from '$lib/components/ListModal.svelte';
	import SiteModal from '$lib/components/SiteModal.svelte';
	import SiteEditor from '$lib/components/SiteEditor.svelte';
	import KeyModal from '$lib/components/KeyModal.svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import type { InferSelectModel } from 'drizzle-orm';
	import type { filterLists as filterListsTable } from '$lib/server/db/schema';
	import { DNS_RR_TYPES } from '$lib/record-types';

	type FilterList = InferSelectModel<typeof filterListsTable>;

	type SiteRow = { id: number; slug: string; description: string; lists: string[] };
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
		const map = new Map<string, DNSRecord[]>();
		for (const r of records) {
			const arr = map.get(r.name);
			if (arr) arr.push(r);
			else map.set(r.name, [r]);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
	<div class="border-border mb-6 flex gap-1 border-b">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {section === 'lists'
				? 'border-primary text-foreground -mb-px border-b-2'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (section = 'lists')}
		>
			Filter Lists
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {section === 'sites'
				? 'border-primary text-foreground -mb-px border-b-2'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (section = 'sites')}
		>
			Sites
			{#if sites.length > 0}
				<span class="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
					>{sites.length}</span
				>
			{/if}
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {section === 'keys'
				? 'border-primary text-foreground -mb-px border-b-2'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (section = 'keys')}
		>
			API Keys
			{#if keys.length > 0}
				<span class="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
					>{keys.length}</span
				>
			{/if}
		</button>
	</div>
</div>

<!-- ─────────────────────── LISTS SECTION ─────────────────────── -->
{#if section === 'lists'}
	<div class="mx-auto max-w-6xl p-4">
		<Tabs.Root value={selectedList} onValueChange={changeTab}>
			<div class="mb-4 flex items-center gap-2">
				<Tabs.List class="h-auto flex-wrap gap-1">
					{#each lists as l (l.id)}
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
					{/each}
				</Tabs.List>
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
							<Button onclick={() => openCreate()}>Add Record</Button>
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
													class="rounded px-1.5 py-0.5 font-mono text-xs {r.type === 'NXDOMAIN' ||
													r.type === 'REFUSED'
														? 'bg-destructive/10 text-destructive'
														: 'bg-muted'}">{r.type}</span
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
								href={`/filter/${l.slug}.txt`}
								class="text-primary underline underline-offset-4 hover:no-underline"
							>
								View generated filter for <span class="font-mono">{l.slug}</span>
							</a>
						</p>
					</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
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
			<Button onclick={() => (siteModalOpen = true)}>
				<Plus class="mr-2 h-4 w-4" />
				New Site
			</Button>
		</div>

		{#if sites.length === 0}
			<div
				class="border-border text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm"
			>
				No sites yet. Create a site and assign filter lists to it.
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Site</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Assigned Lists</Table.Head>
						<Table.Head class="w-36">Filter URL</Table.Head>
						<Table.Head class="w-20"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each sites as site (site.id)}
						<Table.Row>
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
									href="/filter/site/{site.slug}.txt"
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
			<div
				class="border-border text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm"
			>
				No API keys yet. Create a key and add <code class="bg-muted rounded px-1"
					>?token=&lt;key&gt;</code
				> to filter URLs in AdGuard Home.
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

<SiteModal bind:open={siteModalOpen} afterSubmit={refreshSites} />

<SiteEditor
	bind:open={siteEditorOpen}
	bind:site={editingSite}
	availableLists={lists.map((l) => l.slug)}
	afterSubmit={refreshSites}
/>

<KeyModal bind:open={keyModalOpen} afterSubmit={refreshKeys} />
