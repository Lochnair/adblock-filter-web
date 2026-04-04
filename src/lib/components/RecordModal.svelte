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

	// Simple types use a single value string
	let name = $state(record?.name ?? '');
	let type = $state<RecordType>(record?.type ?? 'A');
	let value = $state(record?.value ?? '');

	// Structured fields for complex types
	let mxFields = $state({ priority: '', exchange: '' });
	let srvFields = $state({ priority: '', weight: '', port: '', target: '' });
	let httpsFields = $state({ priority: '', target: '', alpn: '', port: '', ipv4hint: '' });

	$effect(() => {
		name = record?.name ?? '';
		type = record?.type ?? 'A';
		value = record?.value ?? '';

		// Parse existing value into structured fields for editing
		const v = record?.value ?? '';
		const parts = v.trim().split(/\s+/);

		mxFields = {
			priority: parts[0] ?? '',
			exchange: parts[1] ?? ''
		};
		srvFields = {
			priority: parts[0] ?? '',
			weight: parts[1] ?? '',
			port: parts[2] ?? '',
			target: parts[3] ?? ''
		};
		const httpsRemaining = parts.slice(2);
		httpsFields = {
			priority: parts[0] ?? '',
			target: parts[1] ?? '',
			alpn: httpsRemaining.find((p) => p.startsWith('alpn='))?.slice(5) ?? '',
			port: httpsRemaining.find((p) => p.startsWith('port='))?.slice(5) ?? '',
			ipv4hint: httpsRemaining.find((p) => p.startsWith('ipv4hint='))?.slice(9) ?? ''
		};
	});

	// Clear value when switching to no-value types
	$effect(() => {
		if (type === 'REFUSED' || type === 'NXDOMAIN') value = '';
	});

	// Assemble the value string from structured or simple fields
	let assembledValue = $derived.by(() => {
		switch (type) {
			case 'MX':
				return `${mxFields.priority} ${mxFields.exchange}`.trim();
			case 'SRV':
				return `${srvFields.priority} ${srvFields.weight} ${srvFields.port} ${srvFields.target}`.trim();
			case 'HTTPS':
			case 'SVCB': {
				const parts = [httpsFields.priority, httpsFields.target];
				if (httpsFields.alpn) parts.push(`alpn=${httpsFields.alpn}`);
				if (httpsFields.port) parts.push(`port=${httpsFields.port}`);
				if (httpsFields.ipv4hint) parts.push(`ipv4hint=${httpsFields.ipv4hint}`);
				return parts.join(' ');
			}
			default:
				return value;
		}
	});

	const VALUE_META: Partial<Record<RecordType, { placeholder: string; hint: string }>> = {
		A: { placeholder: '192.0.2.1', hint: 'IPv4 address' },
		AAAA: { placeholder: '2001:db8::1', hint: 'IPv6 address' },
		CNAME: { placeholder: 'target.example.com', hint: 'Target hostname' },
		PTR: { placeholder: 'host.example.com', hint: 'Pointer target hostname' },
		TXT: { placeholder: 'v=spf1 include:example.com ~all', hint: 'Arbitrary text content' }
	};

	let clientError = $derived(validateRecord({ name, type, value: assembledValue }));
	let displayError = $derived(clientError || error || null);

	async function recordSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (clientError) {
			error = clientError;
			return;
		}
		const payload = { id: record?.id, name, type, value: assembledValue, list };
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
	<Dialog.Content class="sm:max-w-lg">
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

			<!-- MX: priority + exchange -->
			{#if type === 'MX'}
				<div class="grid grid-cols-[6rem_1fr] gap-3">
					<div class="space-y-1.5">
						<Label for="mx-priority">Priority</Label>
						<Input id="mx-priority" bind:value={mxFields.priority} placeholder="10" inputmode="numeric" />
					</div>
					<div class="space-y-1.5">
						<Label for="mx-exchange">Exchange (mail server)</Label>
						<Input id="mx-exchange" bind:value={mxFields.exchange} placeholder="mail.example.com" />
					</div>
				</div>

			<!-- SRV: priority + weight + port + target -->
			{:else if type === 'SRV'}
				<div class="grid grid-cols-[5rem_5rem_5rem_1fr] gap-3">
					<div class="space-y-1.5">
						<Label for="srv-priority">Priority</Label>
						<Input id="srv-priority" bind:value={srvFields.priority} placeholder="10" inputmode="numeric" />
					</div>
					<div class="space-y-1.5">
						<Label for="srv-weight">Weight</Label>
						<Input id="srv-weight" bind:value={srvFields.weight} placeholder="20" inputmode="numeric" />
					</div>
					<div class="space-y-1.5">
						<Label for="srv-port">Port</Label>
						<Input id="srv-port" bind:value={srvFields.port} placeholder="443" inputmode="numeric" />
					</div>
					<div class="space-y-1.5">
						<Label for="srv-target">Target</Label>
						<Input id="srv-target" bind:value={srvFields.target} placeholder="target.example.com" />
					</div>
				</div>

			<!-- HTTPS / SVCB: priority + target + optional params -->
			{:else if type === 'HTTPS' || type === 'SVCB'}
				<div class="grid grid-cols-[6rem_1fr] gap-3">
					<div class="space-y-1.5">
						<Label for="https-priority">Priority</Label>
						<Input id="https-priority" bind:value={httpsFields.priority} placeholder="1" inputmode="numeric" />
					</div>
					<div class="space-y-1.5">
						<Label for="https-target">Target</Label>
						<Input id="https-target" bind:value={httpsFields.target} placeholder=". (or target.example.com)" />
					</div>
				</div>
				<div class="space-y-2">
					<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Optional parameters</p>
					<div class="grid grid-cols-3 gap-3">
						<div class="space-y-1.5">
							<Label for="https-alpn">ALPN</Label>
							<Input id="https-alpn" bind:value={httpsFields.alpn} placeholder="h2" />
						</div>
						<div class="space-y-1.5">
							<Label for="https-port">Port</Label>
							<Input id="https-port" bind:value={httpsFields.port} placeholder="443" inputmode="numeric" />
						</div>
						<div class="space-y-1.5">
							<Label for="https-ipv4hint">IPv4 hint</Label>
							<Input id="https-ipv4hint" bind:value={httpsFields.ipv4hint} placeholder="192.0.2.1" />
						</div>
					</div>
				</div>

			<!-- No-value types -->
			{:else if type === 'REFUSED' || type === 'NXDOMAIN'}
				<input type="hidden" name="value" value="" />
				<p class="text-muted-foreground text-sm">
					This record type responds with <strong>{type}</strong> and requires no value.
				</p>

			<!-- Simple single-value types (A, AAAA, CNAME, PTR, TXT) -->
			{:else}
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
