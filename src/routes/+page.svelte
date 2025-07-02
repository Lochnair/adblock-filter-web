<script lang="ts">
	import ip_pkg from 'ipaddr.js';
	const { IPv4, IPv6 } = ip_pkg;
	import domain_pkg from 'is-valid-domain';
	const isValidDomain = domain_pkg;
	import {
		A,
		Button,
		Card,
		Input,
		Label,
		Modal,
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

	let lists: List[] = $state([]);
	let selectedList = $state('default');

	let records: Record[] = $state([]);
	let newList = $state('');

	let modalOpen = $state(false);
	let editing: Record | null = $state(null);
	let formName = $state('');
	let formType: Record['type'] = $state('A');
	let formValue = $state('');
	let error = $state('');

	let rr_type = [
		{ name: 'A', value: 'A' },
		{ name: 'AAAA', value: 'AAAA' },
		{ name: 'CNAME', value: 'CNAME' },
		{ name: 'HTTPS', value: 'HTTPS' },
		{ name: 'MX', value: 'MX' },
		{ name: 'PTR', value: 'PTR' },
		{ name: 'SRV', value: 'SRV' },
		{ name: 'TXT', value: 'TXT' }
	];

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

	function openCreate() {
		editing = null;
		formName = '';
		formType = 'A';
		formValue = '';
		error = '';
		modalOpen = true;
	}

	function openEdit(record: Record) {
		editing = record;
		formName = record.name;
		formType = record.type;
		formValue = record.value;
		error = '';
		modalOpen = true;
	}

	function validate() {
		if (!formName) {
			error = 'hostname required';
			return false;
		}
		if (!formValue) {
			error = 'value required';
			return false;
		}

		if (formType === 'A' && !IPv4.isIPv4(formValue)) {
			error = 'invalid IPv4 address';
			return false;
		}
		if (formType === 'AAAA' && !IPv6.isIPv6(formValue)) {
			error = 'invalid IPv6 address';
			return false;
		}
		if (['CNAME', 'PTR', 'HTTPS', 'MX', 'SRV'].includes(formType) && !isValidDomain(formValue)) {
			error = 'invalid domain';
			return false;
		}
		error = '';
		return true;
	}

	async function save() {
		if (!validate()) return;
		if (editing) {
			await fetch('/api/records', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					id: editing.id,
					name: formName,
					type: formType,
					value: formValue
				})
			});
		} else {
			await fetch('/api/records', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: formName,
					type: formType,
					value: formValue,
					list: selectedList
				})
			});
		}
		modalOpen = false;
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

	$effect(() => {
		loadLists();
		load();
	});
</script>

<h1 class="mb-4 text-2xl font-bold">DNS Records</h1>
<Card class="mx-auto mb-6 max-w-xl">
	<form class="space-y-4" on:submit|preventDefault={createList}>
		<div>
			<Label for="list-slug">List Slug</Label>
			<Input id="list-slug" bind:value={newList} placeholder="new list slug" />
		</div>
		<div class="text-right">
			<Button type="submit">Create List</Button>
		</div>
	</form>
</Card>
<Card class="mx-auto mb-6 max-w-xl">
	<div class="space-y-1">
		<Label for="list-select">Select List</Label>
		<Select id="list-select" bind:value={selectedList} onchange={load}>
			{#each lists as l (l.id)}
				<option value={l.slug}>{l.slug}</option>
			{/each}
		</Select>
	</div>
</Card>
<Card class="mx-auto mb-6 max-w-xl text-center">
	<Button onclick={openCreate}>Add Record</Button>
</Card>

<Modal bind:open={modalOpen} onclose={() => (error = '')}>
	<form method="dialog" class="space-y-4" on:submit|preventDefault={save}>
		<div>
			<Label for="record-name">Hostname</Label>
			<Input id="record-name" bind:value={formName} placeholder="hostname" />
		</div>
		<div>
			<Label for="record-type">Type</Label>
			<Select id="record-type" bind:value={formType} items={rr_type} />
		</div>
		<div>
			<Label for="record-value">Value</Label>
			<Input id="record-value" bind:value={formValue} placeholder="value" />
		</div>
		{#if error}
			<p class="text-red-600">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button color="gray" onclick={() => (modalOpen = false)} type="button">Cancel</Button>
			<Button type="submit">Save</Button>
		</div>
	</form>
</Modal>

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
						<Button size="xs" onclick={() => openEdit(r)}>
							<EditOutline class="h-4 w-4" />
						</Button>
						<Button color="red" size="xs" onclick={() => remove(r.id)}>
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
