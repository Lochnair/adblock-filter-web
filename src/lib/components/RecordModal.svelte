<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { DNSRecord } from '$lib/server/adblock';
	import { RECORD_TYPES, DNS_RR_TYPES, type RecordType } from '$lib/record-types';
	import { validateRecord } from '$lib/validation';

	let {
		open = $bindable(false),
		record = $bindable<DNSRecord | null>(null),
		error = $bindable(''),
		list = $bindable('default'),
		initialName = '',
		afterSubmit = $bindable(async () => {})
	} = $props();

	// Simple types use a single value string
	let name = $state(record?.name ?? initialName);
	let type = $state<RecordType>(record?.type ?? 'A');
	let value = $state(record?.value ?? '');

	// Structured fields for complex types
	let mxFields = $state({ priority: '', exchange: '' });
	let srvFields = $state({ priority: '', weight: '', port: '', target: '' });
	let httpsFields = $state({ priority: '', target: '', alpn: '', port: '', ipv4hint: '' });

	// NODATA toggle — when true, value is empty (suppress this query type with NODATA)
	let nodata = $state(false);

	// Scope for NXDOMAIN/REFUSED — empty = all queries, type name = specific query type only
	let scope = $state('');

	$effect(() => {
		if (!open) return;
		name = record?.name ?? initialName;
		type = record?.type ?? 'A';
		value = record?.value ?? '';

		// Use record's type here — NOT the reactive `type` variable.
		// Reading `type` inside this effect would make it re-run whenever the
		// user changes the selector, immediately resetting type back to record's value.
		const recordType = record?.type ?? 'A';
		const isRR = DNS_RR_TYPES.includes(recordType as (typeof DNS_RR_TYPES)[number]);
		nodata = isRR && record !== null && (record?.value ?? '') === '';

		// Restore scope for NXDOMAIN/REFUSED
		scope = recordType === 'NXDOMAIN' || recordType === 'REFUSED' ? (record?.value ?? '') : '';

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
			alpn: httpsRemaining.find((p: string) => p.startsWith('alpn='))?.slice(5) ?? '',
			port: httpsRemaining.find((p: string) => p.startsWith('port='))?.slice(5) ?? '',
			ipv4hint: httpsRemaining.find((p: string) => p.startsWith('ipv4hint='))?.slice(9) ?? ''
		};
	});

	function resetFields() {
		nodata = false;
		scope = '';
		value = '';
		mxFields = { priority: '', exchange: '' };
		srvFields = { priority: '', weight: '', port: '', target: '' };
		httpsFields = { priority: '', target: '', alpn: '', port: '', ipv4hint: '' };
	}

	// Assemble the value string from structured or simple fields
	let assembledValue = $derived.by(() => {
		if (nodata) return '';
		if (type === 'NXDOMAIN' || type === 'REFUSED') return scope;
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

	const isRRType = $derived(DNS_RR_TYPES.includes(type as (typeof DNS_RR_TYPES)[number]));

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
				<Select.Root bind:value={type} onValueChange={resetFields}>
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

			<!-- NODATA toggle for real RR types -->
			{#if isRRType}
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						bind:checked={nodata}
						class="accent-primary h-4 w-4 rounded border"
					/>
					<span class="text-sm"
						>No record for this type <span class="text-muted-foreground">(return NODATA)</span
						></span
					>
				</label>
			{/if}

			{#if !nodata}
				<!-- MX: priority + exchange -->
				{#if type === 'MX'}
					<div class="grid grid-cols-[6rem_1fr] gap-3">
						<div class="space-y-1.5">
							<Label for="mx-priority">Priority</Label>
							<Input
								id="mx-priority"
								bind:value={mxFields.priority}
								placeholder="10"
								inputmode="numeric"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="mx-exchange">Exchange (mail server)</Label>
							<Input
								id="mx-exchange"
								bind:value={mxFields.exchange}
								placeholder="mail.example.com"
							/>
						</div>
					</div>

					<!-- SRV: priority + weight + port + target -->
				{:else if type === 'SRV'}
					<div class="grid grid-cols-[5rem_5rem_5rem_1fr] gap-3">
						<div class="space-y-1.5">
							<Label for="srv-priority">Priority</Label>
							<Input
								id="srv-priority"
								bind:value={srvFields.priority}
								placeholder="10"
								inputmode="numeric"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="srv-weight">Weight</Label>
							<Input
								id="srv-weight"
								bind:value={srvFields.weight}
								placeholder="20"
								inputmode="numeric"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="srv-port">Port</Label>
							<Input
								id="srv-port"
								bind:value={srvFields.port}
								placeholder="443"
								inputmode="numeric"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="srv-target">Target</Label>
							<Input
								id="srv-target"
								bind:value={srvFields.target}
								placeholder="target.example.com"
							/>
						</div>
					</div>

					<!-- HTTPS / SVCB: priority + target + optional params -->
				{:else if type === 'HTTPS' || type === 'SVCB'}
					<div class="grid grid-cols-[6rem_1fr] gap-3">
						<div class="space-y-1.5">
							<Label for="https-priority">Priority</Label>
							<Input
								id="https-priority"
								bind:value={httpsFields.priority}
								placeholder="1"
								inputmode="numeric"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="https-target">Target</Label>
							<Input
								id="https-target"
								bind:value={httpsFields.target}
								placeholder=". (or target.example.com)"
							/>
						</div>
					</div>
					<div class="space-y-2">
						<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Optional parameters
						</p>
						<div class="grid grid-cols-3 gap-3">
							<div class="space-y-1.5">
								<Label for="https-alpn">ALPN</Label>
								<Input id="https-alpn" bind:value={httpsFields.alpn} placeholder="h2" />
							</div>
							<div class="space-y-1.5">
								<Label for="https-port">Port</Label>
								<Input
									id="https-port"
									bind:value={httpsFields.port}
									placeholder="443"
									inputmode="numeric"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="https-ipv4hint">IPv4 hint</Label>
								<Input
									id="https-ipv4hint"
									bind:value={httpsFields.ipv4hint}
									placeholder="192.0.2.1"
								/>
							</div>
						</div>
					</div>

					<!-- NXDOMAIN / REFUSED: scope select -->
				{:else if type === 'REFUSED' || type === 'NXDOMAIN'}
					<div class="space-y-1.5">
						<Label for="record-scope">Respond with {type} for</Label>
						<Select.Root bind:value={scope}>
							<Select.Trigger id="record-scope">
								{scope === '' ? 'All queries' : scope}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="" label="All queries" />
								{#each DNS_RR_TYPES as rt (rt)}
									<Select.Item value={rt} label={rt} />
								{/each}
							</Select.Content>
						</Select.Root>
						{#if scope === ''}
							<p class="text-muted-foreground text-xs">Blocks all DNS queries for this hostname.</p>
						{:else}
							<p class="text-muted-foreground text-xs">
								Only affects {scope} queries; other types pass through.
							</p>
						{/if}
					</div>

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
