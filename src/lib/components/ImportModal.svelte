<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	let {
		open = $bindable(false),
		listSlug,
		onimport
	}: { open: boolean; listSlug: string; onimport: () => void } = $props();

	let rules = $state('');
	let loading = $state(false);
	let result = $state<{
		imported: number;
		duplicate: number;
		invalid: number;
		unrecognized: number;
		errors: string[];
	} | null>(null);
	let error = $state('');

	function reset() {
		rules = '';
		result = null;
		error = '';
		loading = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!rules.trim()) return;
		loading = true;
		error = '';
		result = null;
		try {
			const res = await fetch('/api/records/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ listSlug, rules })
			});
			if (!res.ok) {
				error = await res.text();
				return;
			}
			result = await res.json();
			if (result.imported > 0) onimport();
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) reset(); }}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Import Rules</Dialog.Title>
			<Dialog.Description>
				Paste AdGuard Home custom rules or hosts-format lines to import into <strong>{listSlug}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		{#if result}
			<div class="space-y-3">
				<div class="bg-muted rounded-md p-4 text-sm space-y-1">
					<p><span class="font-semibold">{result.imported}</span> record{result.imported === 1 ? '' : 's'} imported</p>
					{#if result.duplicate > 0}
						<p class="text-muted-foreground">{result.duplicate} duplicate{result.duplicate === 1 ? '' : 's'} skipped</p>
					{/if}
					{#if result.invalid > 0}
						<p class="text-destructive">{result.invalid} invalid line{result.invalid === 1 ? '' : 's'} rejected</p>
					{/if}
					{#if result.unrecognized > 0}
						<p class="text-muted-foreground">{result.unrecognized} unrecognized line{result.unrecognized === 1 ? '' : 's'} skipped</p>
					{/if}
				</div>
				{#if result.errors.length > 0}
					<details class="text-xs">
						<summary class="cursor-pointer text-muted-foreground">Show errors</summary>
						<ul class="mt-1 space-y-0.5 font-mono text-destructive">
							{#each result.errors as e}
								<li>{e}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>
			<Dialog.Footer>
				<Button onclick={() => { result = null; rules = ''; }}>Import More</Button>
				<Button variant="outline" onclick={() => (open = false)}>Close</Button>
			</Dialog.Footer>
		{:else}
			<form class="space-y-3" onsubmit={submit}>
				<textarea
					bind:value={rules}
					placeholder="example.com$dnsrewrite=NOERROR;A;1.2.3.4&#10;||bad.example.com^&#10;1.2.3.4 other.example.com"
					rows={10}
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
				></textarea>
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
				<Dialog.Footer>
					<Button variant="outline" type="button" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={!rules.trim() || loading}>
						{loading ? 'Importing…' : 'Import'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
