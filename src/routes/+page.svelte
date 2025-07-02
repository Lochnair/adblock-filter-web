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
		TableHeadCell
	} from 'flowbite-svelte';
	import { EditOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import NavBar from '$lib/components/NavBar.svelte';
	import RecordModal from '$lib/components/RecordModal.svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import type { InferModel } from 'drizzle-orm';
	import type { filterLists } from '$lib/server/db/schema';
	let { data } = $props<{
		data: {
			lists: InferModel<typeof filterLists>[];
			records: DNSRecord[];
			selectedList: string;
		};
	}>();
	let lists = $state(data.lists);
	let records = $state(data.records);
	let selectedList = $state(data.selectedList);
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
		await fetch('?/deleteRecord', { method: 'POST', body: form });
		await refresh();
	}

	async function refresh() {
		const res = await fetch(`?list=${selectedList}`);
		const json: Record<string, unknown> = await res.json();
		const data = json as { lists: InferModel<typeof filterLists>[]; records: DNSRecord[] };
		lists = data.lists;
		records = data.records;
	}

	async function createListSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.target as HTMLFormElement);
		await fetch('?/createList', { method: 'POST', body: form });
		newList = '';
		await refresh();
	}
</script>

<NavBar />

<h1 class="mb-4 text-2xl font-bold">DNS Records</h1>
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
