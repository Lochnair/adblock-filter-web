<script lang="ts">
	import {
		A,
		Button,
		Card,
		Input,
		Label,
		P,
		Select,
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
	let lists = $derived(data.lists);
	let records = $derived(data.records);
	let selectedList = $derived(data.selectedList);
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
		const form = new FormData();
		form.set('id', id.toString());
		await fetch('/api/records', { method: 'DELETE', body: form });
		await refresh();
	}

	async function refresh() {
		const res = await fetch(`/api/records?list=${selectedList}`);
		const json: Record<string, unknown> = await res.json();
		const data = json as { lists: InferSelectModel<typeof filterLists>[]; records: DNSRecord[] };
		lists = data.lists;
		records = data.records;
	}

	async function createListSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.target as HTMLFormElement);
		await fetch('/api/lists', { method: 'POST', body: form });
		newList = '';
		await refresh();
	}

	let activeTab = $state(0); // index of the currently displayed list
</script>

<Tabs>
	{#each lists as l (l.id)}
		<TabItem open={l.id === activeTab}>
			{#snippet titleSlot()}
				<span class="flex items-center">
					{l.slug}
					<button class="ms-2 rounded p-0.5 hover:bg-red-100" aria-label="Delete list">
						<CloseOutline class="h-4 w-4 text-red-600" />
					</button>
				</span>
			{/snippet}
			<div class="p-4">
				<!-- … your list’s items … -->
			</div>
		</TabItem>
	{/each}

	<button
		class="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100"
		aria-label="Create new list"
	>
		<PlusOutline class="h-5 w-5 text-green-600" />
		<span class="text-sm">New</span>
	</button>
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
<Card class="mx-auto mb-6 max-w-xl">
	<div class="space-y-1">
		<Label for="list-select">Select List</Label>
		<Select id="list-select" bind:value={selectedList} onchange={refresh}>
			{#each lists as l (l.id)}
				<option value={l.slug}>{l.slug}</option>
			{/each}
		</Select>
	</div>
</Card>
<Card class="mx-auto mb-6 max-w-xl text-center">
	<Button onclick={openCreate}>Add Record</Button>
</Card>

<RecordModal
	bind:open={modalOpen}
	record={editing}
	list={selectedList}
	bind:error
	afterSubmit={refresh}
/>

<Card class="mx-auto mt-6 max-w-xl">
	<Table>
		<TableHead>
			<TableHeadCell>Hostname</TableHeadCell>
			<TableHeadCell>Type</TableHeadCell>
			<TableHeadCell>Value</TableHeadCell>
			<TableHeadCell></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each records as r (r.id)}
				<TableBodyRow>
					<TableBodyCell>{r.name}</TableBodyCell>
					<TableBodyCell>{r.type}</TableBodyCell>
					<TableBodyCell>{r.value}</TableBodyCell>
					<TableBodyCell class="flex justify-end gap-2">
						<Button aria-label="Edit" size="xs" onclick={() => openEdit(r)}>
							<EditOutline class="h-4 w-4" />
						</Button>
						<Button aria-label="Delete" color="red" size="xs" onclick={() => removeRecord(r.id)}>
							<TrashBinOutline class="h-4 w-4" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</Card>

<P class="mt-6 text-center">
	<A class="text-blue-600 underline" href={`/filter/${selectedList}.txt`}>View Generated Filter</A>
</P>
