<script lang="ts">
	import { Modal, Button, Label, Input, Select, Alert } from 'flowbite-svelte';
	import type { DNSRecord } from '$lib/server/adblock';
	import { RECORD_TYPES } from '$lib/record-types';
	import { validateRecord } from '$lib/validation';

	let {
		open = $bindable(false),
		record = $bindable<DNSRecord | null>(null),
		error = $bindable(''),
		list = $bindable('default'),
		afterSubmit = $bindable(async () => {})
	} = $props();

	let name = $derived(record?.name);
	let type: DNSRecord['type'] = $derived(record?.type || 'A');
	let value = $derived(record?.value);
	let clientError: string | null = $derived(
		validateRecord({ name: name ?? '', type, value: value ?? '' })
	);
	let displayError: string | null = $derived(clientError || error || null);

	async function recordSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (clientError) {
			error = clientError;
			return;
		}
		const payload = {
			id: record?.id,
			name,
			type,
			value,
			list
		};
		const method = record ? 'PUT' : 'POST';
		const res = await fetch('/api/records', {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			error = await res.text();
			return;
		}
		await afterSubmit();
		open = false;
	}
</script>

<Modal bind:open onclose={() => (error = '')}>
	<form method="dialog" onsubmit={recordSubmit} class="space-y-4">
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
		{#if displayError}
			<Alert color="failure" class="mt-2">{displayError}</Alert>
		{/if}
		<div class="flex justify-end gap-2">
			<Button color="gray" type="button" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={clientError}>Save</Button>
		</div>
	</form>
</Modal>
