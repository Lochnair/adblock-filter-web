<script lang="ts">
	import { onMount } from 'svelte';
	import ip_pkg from 'ipaddr.js';
	const {IPv4, IPv6} = ip_pkg;
	import domain_pkg from 'is-valid-domain';
	const isValidDomain = domain_pkg;
	import {
		Button,
		Card,
		Input,
		Modal,
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

	let lists: List[] = [];
	let selectedList = 'default';

	let records: Record[] = [];
	let newList = '';

	let modalOpen = false;
	let editing: Record | null = null;
	let formName = '';
	let formType: Record['type'] = 'A';
	let formValue = '';
	let error = '';

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

	onMount(async () => {
		await loadLists();
		await load();
	});
</script>

<h1 class="mb-4 text-2xl font-bold">DNS Records</h1>
<Card class="mx-auto mb-6 max-w-xl">
	<form class="flex items-end gap-2" on:submit|preventDefault={createList}>
		<Input bind:value={newList} placeholder="new list slug" />
		<Button type="submit">Create List</Button>
	</form>
</Card>
<Card class="mx-auto mb-6 max-w-xl">
	<Select bind:value={selectedList} onchange={load}>
		{#each lists as l (l.id)}
			<option value={l.slug}>{l.slug}</option>
		{/each}
	</Select>
</Card>
<Card class="mx-auto mb-6 max-w-xl text-center">
	<Button onclick={openCreate}>Add Record</Button>
</Card>

<Modal bind:open={modalOpen} onclose={() => (error = '')}>
	<form on:submit|preventDefault={save}>
		<Input bind:value={formName} placeholder="hostname" />
		<Select bind:value={formType}>
			<option>A</option>
			<option>AAAA</option>
			<option>CNAME</option>
			<option>HTTPS</option>
			<option>MX</option>
			<option>PTR</option>
			<option>SRV</option>
			<option>TXT</option>
		</Select>
		<Input bind:value={formValue} placeholder="value" />
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

<p class="mt-6 text-center">
	<a class="text-blue-600 underline" href={`/filter/${selectedList}.txt`}>View Generated Filter</a>
</p>
