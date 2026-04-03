<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { DNSRecord } from '$lib/server/adblock';
	import { RECORD_TYPES, type RecordType } from '$lib/record-types';
	import { validateRecord } from '$lib/validation';

	let {
		open = $bindable(false),
		record = $bindable<DNSRecord | null>(null),
		error = $bindable(''),
		list = $bindable('default'),
		afterSubmit = $bindable(async () => {})
	} = $props();

	// Mutable form state — reset when the record prop changes
	let name = $state(record?.name ?? '');
	let type = $state<RecordType>(record?.type ?? 'A');
	let value = $state(record?.value ?? '');

	$effect(() => {
		name = record?.name ?? '';
		type = record?.type ?? 'A';
		value = record?.value ?? '';
	});

	// Clear value when switching to no-value types
	$effect(() => {
		if (type === 'REFUSED' || type === 'NXDOMAIN') value = '';
	});

	const VALUE_META: Record<RecordType, { placeholder: string; hint: string } | null> = {
		A: { placeholder: '192.0.2.1', hint: 'IPv4 address' },
		AAAA: { placeholder: '2001:db8::1', hint: 'IPv6 address' },
		CNAME: { placeholder: 'target.example.com', hint: 'Target hostname' },
		MX: { placeholder: '10 mail.example.com', hint: 'Priority then mail server hostname' },
		PTR: { placeholder: 'host.example.com', hint: 'Pointer target hostname' },
		SRV: {
			placeholder: '10 20 443 target.example.com',
			hint: 'Priority weight port target'
		},
		TXT: { placeholder: 'v=spf1 include:example.com ~all', hint: 'Arbitrary text content' },
		HTTPS: { placeholder: '1 . alpn=h2', hint: 'Priority target [alpn=…] [port=…] [ipv4hint=…]' },
		SVCB: { placeholder: '1 . port=443', hint: 'Priority target [alpn=…] [port=…] [ipv4hint=…]' },
		REFUSED: null,
		NXDOMAIN: null
	};

	let clientError = $derived(validateRecord({ name, type, value }));
	let displayError = $derived(clientError || error || null);

	async function recordSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (clientError) {
			error = clientError;
			return;
		}
		const payload = { id: record?.id, name, type, value, list };
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

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) error = '';
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{record ? 'Edit Record' : 'Add Record'}</Dialog.Title>
		</Dialog.Header>
		<form method="dialog" onsubmit={recordSubmit} class="space-y-4">
			{#if record}
				<input type="hidden" name="id" value={record.id} />
			{/if}
			<input type="hidden" name="list" value={list} />

			<div class="space-y-1.5">
				<Label for="record-name">Hostname</Label>
				<Input id="record-name" bind:value={name} name="name" placeholder="hostname.example.com" />
			</div>

			<div class="space-y-1.5">
				<Label for="record-type">Type</Label>
				<Select.Root bind:value={type}>
					<Select.Trigger id="record-type">
						{type}
					</Select.Trigger>
					<Select.Content>
						{#each RECORD_TYPES as rt (rt)}
							<Select.Item value={rt} label={rt} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			{#if VALUE_META[type] !== null}
				<div class="space-y-1.5">
					<Label for="record-value">Value</Label>
					<Input
						id="record-value"
						bind:value
						name="value"
						placeholder={VALUE_META[type]?.placeholder ?? ''}
					/>
					{#if VALUE_META[type]?.hint}
						<p class="text-muted-foreground text-xs">{VALUE_META[type]?.hint}</p>
					{/if}
				</div>
			{:else}
				<input type="hidden" name="value" value="" />
				<p class="text-muted-foreground text-sm">
					This record type responds with <strong>{type}</strong> and requires no value.
				</p>
			{/if}

			{#if displayError}
				<p class="text-destructive text-sm">{displayError}</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={clientError !== null}>Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
