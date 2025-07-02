<script lang="ts">
	import {
		A,
		Button,
		Card,
		Input,
		Label,
		P,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tabs,
		TabItem
	} from 'flowbite-svelte';
	import { EditOutline, TrashBinOutline, CloseOutline, PlusOutline } from 'flowbite-svelte-icons';
	import RecordModal from '$lib/components/RecordModal.svelte';
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
	let recordsByList = $state<Record<string, DNSRecord[]>>({
		[selectedList]: data.records
	});
	let newList = $state('');
	let modalOpen = $state(false);
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

	async function createListSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.target as HTMLFormElement);
		const slug = form.get('slug');
		await fetch('/api/lists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug })
		});
		newList = '';
		await refresh();
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

<Tabs>
	{#each lists as l (l.id)}
		<TabItem open={selectedList === l.slug} onclick={() => changeTab(l.slug)}>
			{#snippet titleSlot()}
				<span class="flex items-center">
					{l.slug}
					<button
						class="ms-2 rounded p-0.5 hover:bg-red-100"
						aria-label="Delete list"
						onclick={() => removeList(l.slug)}
					>
						<CloseOutline class="h-4 w-4 text-red-600" />
					</button>
				</span>
			{/snippet}
			<div class="space-y-4 p-4">
				<div class="text-right">
					<Button onclick={openCreate}>Add Record</Button>
				</div>
				<Table>
					<TableHead>
						<TableHeadCell>Hostname</TableHeadCell>
						<TableHeadCell>Type</TableHeadCell>
						<TableHeadCell>Value</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{#each recordsByList[l.slug] ?? [] as r (r.id)}
							<TableBodyRow>
								<TableBodyCell>{r.name}</TableBodyCell>
								<TableBodyCell>{r.type}</TableBodyCell>
								<TableBodyCell>{r.value}</TableBodyCell>
								<TableBodyCell class="flex justify-end gap-2">
									<Button aria-label="Edit" size="xs" onclick={() => openEdit(r)}>
										<EditOutline class="h-4 w-4" />
									</Button>
									<Button
										aria-label="Delete"
										color="red"
										size="xs"
										onclick={() => removeRecord(r.id)}
									>
										<TrashBinOutline class="h-4 w-4" />
									</Button>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
				<P class="text-center">
					<A class="text-blue-600 underline" href={`/filter/${l.slug}.txt`}>View Generated Filter</A
					>
				</P>
			</div>
		</TabItem>
	{/each}

	<Button
		class="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100"
		aria-label="Create new list">
		<PlusOutline class="h-5 w-5 text-green-600" />
	</Button>
</Tabs>

<Card class="mx-auto mb-6 max-w-xl">
	<form class="space-y-4" onsubmit={createListSubmit}>
		<div>
			<Label for="list-slug">List Slug</Label>
			<Input id="list-slug" bind:value={newList} placeholder="new list slug" name="slug" />
		</div>
		<div class="text-right">
			<Button type="submit">Create List</Button>
		</div>
	</form>
</Card>

<RecordModal
	bind:open={modalOpen}
	record={editing}
	list={selectedList}
	bind:error
	afterSubmit={refresh}
/>
