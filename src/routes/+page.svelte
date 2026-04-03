<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Pencil, Trash2, X, Plus } from 'lucide-svelte';
	import RecordModal from '$lib/components/RecordModal.svelte';
	import ListModal from '$lib/components/ListModal.svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import type { InferSelectModel } from 'drizzle-orm';
	import type { filterLists } from '$lib/server/db/schema';

	let { data } = $props<{
		data: {
			lists: InferSelectModel<typeof filterLists>[];
			records: DNSRecord[];
			selectedList: string;
		};
	}>();

	let lists = $state(data.lists);
	let selectedList = $state(data.selectedList);
	const initialRecords: Record<string, DNSRecord[]> = {};
	initialRecords[data.selectedList] = data.records;
	let recordsByList = $state<Record<string, DNSRecord[]>>(initialRecords);
	let modalOpen = $state(false);
	let listModalOpen = $state(false);
	let editing: DNSRecord | null = $state(null);
	let error = $state('');

	function openCreate() {
		editing = null;
		error = '';
		modalOpen = true;
	}

	function openEdit(record: DNSRecord) {
		editing = record;
		error = '';
		modalOpen = true;
	}

	async function removeRecord(id: number) {
		if (!confirm('Are you sure you want to delete this record?')) return;
		await fetch(`/api/records?id=${id}`, { method: 'DELETE' });
		await refresh();
	}

	async function refresh() {
		const [listRes, recordRes] = await Promise.all([
			fetch('/api/lists'),
			fetch(`/api/records?list=${selectedList}`)
		]);
		lists = await listRes.json();
		recordsByList = {
			...recordsByList,
			[selectedList]: await recordRes.json()
		};
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
		if (!confirm('Delete this list and all records?')) return;
		await fetch('/api/lists', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug })
		});
		delete recordsByList[slug];
		await refresh();
		if (selectedList === slug && lists.length) {
			selectedList = lists[0].slug;
			loadRecords(selectedList);
		}
	}
</script>

<div class="mx-auto max-w-6xl p-4">
	<Tabs.Root value={selectedList} onValueChange={changeTab}>
		<div class="mb-4 flex items-center gap-2">
			<Tabs.List class="flex-wrap gap-1 h-auto">
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
										<span class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{r.type}</span>
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

<RecordModal
	bind:open={modalOpen}
	record={editing}
	list={selectedList}
	bind:error
	afterSubmit={refresh}
/>

<ListModal bind:open={listModalOpen} afterSubmit={refresh} />
