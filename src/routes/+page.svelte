<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Pencil, Trash2, X, Plus, Globe } from 'lucide-svelte';
	import RecordModal from '$lib/components/RecordModal.svelte';
	import ListModal from '$lib/components/ListModal.svelte';
	import SiteModal from '$lib/components/SiteModal.svelte';
	import SiteEditor from '$lib/components/SiteEditor.svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import type { InferSelectModel } from 'drizzle-orm';
	import type { filterLists as filterListsTable } from '$lib/server/db/schema';

	type FilterList = InferSelectModel<typeof filterListsTable>;

	type SiteRow = { id: number; slug: string; description: string; lists: string[] };

	let { data } = $props<{
		data: {
			lists: FilterList[];
			records: DNSRecord[];
			selectedList: string;
			sites: SiteRow[];
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
	let recordError = $state('');

	// ── Sites state ──────────────────────────────────────────────────────────
	let sites = $state<SiteRow[]>(data.sites);
	let siteModalOpen = $state(false);
	let siteEditorOpen = $state(false);
	let editingSite: SiteRow | null = $state(null);

	// ── Top-level section ────────────────────────────────────────────────────
	let section = $state<'lists' | 'sites'>('lists');

	// ── List helpers ─────────────────────────────────────────────────────────
	function openCreate() {
		editing = null;
		recordError = '';
		modalOpen = true;
	}

	function openEdit(record: DNSRecord) {
		editing = record;
		recordError = '';
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
				? 'border-b-2 border-primary text-foreground -mb-px'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (section = 'lists')}
		>
			Filter Lists
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {section === 'sites'
				? 'border-b-2 border-primary text-foreground -mb-px'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (section = 'sites')}
		>
			Sites
			{#if sites.length > 0}
				<span class="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs">{sites.length}</span>
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
								class="ml-1 rounded p-0.5 hover:bg-destructive/20"
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
					<div class="space-y-4">
						<div class="flex justify-end">
							<Button onclick={openCreate}>Add Record</Button>
						</div>

						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Hostname</Table.Head>
									<Table.Head>Type</Table.Head>
									<Table.Head>Value</Table.Head>
									<Table.Head></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each recordsByList[l.slug] ?? [] as r (r.id)}
									<Table.Row>
										<Table.Cell class="font-mono text-sm">{r.name}</Table.Cell>
										<Table.Cell>
											<span class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs"
												>{r.type}</span
											>
										</Table.Cell>
										<Table.Cell class="font-mono text-sm">{r.value || '—'}</Table.Cell>
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
							</Table.Body>
						</Table.Root>

						<p class="text-muted-foreground text-center text-sm">
							<a
								href={`/filter/${l.slug}.txt`}
								class="text-primary underline underline-offset-4 hover:no-underline"
							>
								View Generated Filter ({l.slug})
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
	<div class="mx-auto max-w-6xl p-4 space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold">Sites</h2>
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
			<div class="border-border text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
				No sites yet. Create a site and assign filter lists to it.
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Site</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Assigned Lists</Table.Head>
						<Table.Head>Filter URL</Table.Head>
						<Table.Head></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each sites as site (site.id)}
						<Table.Row>
							<Table.Cell class="font-mono text-sm font-medium">{site.slug}</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">{site.description || '—'}</Table.Cell>
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
							<Table.Cell>
								<a
									href="/filter/site/{site.slug}.txt"
									target="_blank"
									class="text-primary font-mono text-xs underline underline-offset-2 hover:no-underline"
								>
									<Globe class="mr-1 inline h-3 w-3" />/filter/site/{site.slug}.txt
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

<!-- ─────────────────────── MODALS ─────────────────────── -->
<RecordModal
	bind:open={modalOpen}
	record={editing}
	list={selectedList}
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
