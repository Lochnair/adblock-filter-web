<script lang="ts">
	import { Modal, Button, Label, Input, Select } from 'flowbite-svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import { RECORD_TYPES } from '$lib/record-types';

	export let open = false;
	export let record: DNSRecord | null = null;
	export let error = '';
	export let list = 'default';
	export let afterSubmit: () => Promise<void> = async () => {};

	let name = '';
	let type: DNSRecord['type'] = 'A';
	let value = '';

	$: if (record) {
		name = record.name;
		type = record.type;
		value = record.value;
	}
	async function recordSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.target as HTMLFormElement);
		const res = await fetch('?/saveRecord', { method: 'POST', body: form });
		if (!res.ok) {
			error = await res.text();
			return;
		}
		await afterSubmit();
		open = false;
	}
</script>

<Modal bind:open onclose={() => (error = '')}>
	<form method="dialog" on:submit={recordSubmit} class="space-y-4">
		{#if record}
			<input type="hidden" name="id" value={record.id} />
		{/if}
		<input type="hidden" name="list" value={list} />
		<div>
			<Label for="record-name">Hostname</Label>
			<Input id="record-name" bind:value={name} name="name" placeholder="hostname" />
		</div>
		<div>
			<Label for="record-type">Type</Label>
			<Select id="record-type" name="type" bind:value={type}>
				{#each RECORD_TYPES as rt (rt)}
					<option value={rt}>{rt}</option>
				{/each}
			</Select>
		</div>
		<div>
			<Label for="record-value">Value</Label>
			<Input id="record-value" bind:value name="value" placeholder="value" />
		</div>
		{#if error}
			<p class="text-red-600">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button color="gray" type="button" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit">Save</Button>
		</div>
	</form>
</Modal>
