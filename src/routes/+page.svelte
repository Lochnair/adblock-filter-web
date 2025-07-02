<script lang="ts">
	import { onMount } from 'svelte';
	import { Input } from 'flowbite-svelte';
	import { Select } from 'flowbite-svelte';
	import { Button } from 'flowbite-svelte';
	import {
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell
	} from 'flowbite-svelte';
	import { Card } from 'flowbite-svelte';
	import TrashBinOutline from 'flowbite-svelte-icons/TrashBinOutline.svelte';

	interface Record {
		id: number;
		name: string;
		type: string;
		value: string;
	}

	interface List {
		id: number;
		slug: string;
	}

	let lists: List[] = [];
	let selectedList = 'default';

	let records: Record[] = [];
	let name = '';
	let type = 'A';
	let value = '';
	let newList = '';

	async function loadLists() {
		const res = await fetch('/api/lists');
		lists = await res.json();
		if (!lists.find((l) => l.slug === selectedList) && lists.length > 0) {
			selectedList = lists[0].slug;
		}
	}

	async function load() {
		const res = await fetch(`/api/records?list=${selectedList}`);
		records = await res.json();
	}

	async function create() {
		await fetch('/api/records', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, type, value, list: selectedList })
		});
		name = '';
		value = '';
		await load();
	}

	async function remove(id: number) {
		await fetch(`/api/records?id=${id}`, { method: 'DELETE' });
		await load();
	}

	async function createList() {
		await fetch('/api/lists', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ slug: newList })
		});
		newList = '';
		await loadLists();
	}

	onMount(async () => {
		await loadLists();
		await load();
	});
</script>

<h1 class="mb-4 text-2xl font-bold">DNS Records</h1>
<Card class="mx-auto mb-6 max-w-xl">
	<form on:submit|preventDefault={createList} class="flex items-end gap-2">
		<Input bind:value={newList} placeholder="new list slug" />
		<Button type="submit">Create List</Button>
	</form>
</Card>
<Card class="mx-auto mb-6 max-w-xl">
	<Select bind:value={selectedList} on:change={load}>
		{#each lists as l (l.id)}
			<option value={l.slug}>{l.slug}</option>
		{/each}
	</Select>
</Card>
<Card class="mx-auto max-w-xl">
	<form on:submit|preventDefault={create} class="flex flex-col gap-4">
		<Input bind:value={name} placeholder="hostname" />
		<Select bind:value={type}>
			<option>A</option>
			<option>AAAA</option>
			<option>CNAME</option>
			<option>HTTPS</option>
			<option>MX</option>
			<option>PTR</option>
			<option>SRV</option>
			<option>TXT</option>
		</Select>
		<Input bind:value placeholder="value" />
		<Button type="submit">Add</Button>
	</form>
</Card>

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
					<TableBodyCell class="text-right">
						<Button color="red" size="xs" on:click={() => remove(r.id)}>
							<TrashBinOutline class="h-4 w-4" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</Card>

<p class="mt-6 text-center">
	<a href={`/filter/${selectedList}.txt`} class="text-blue-600 underline">View Generated Filter</a>
</p>
