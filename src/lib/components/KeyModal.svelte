<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Copy, Check } from 'lucide-svelte';

	let {
		open = $bindable(false),
		afterSubmit = $bindable(async () => {})
	} = $props();

	let name = $state('');
	let error = $state('');
	let createdKey = $state<string | null>(null);
	let copied = $state(false);

	function reset() {
		name = '';
		error = '';
		createdKey = null;
		copied = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		const res = await fetch('/api/keys', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: name.trim() })
		});
		if (!res.ok) {
			error = await res.text();
			return;
		}
		const data = await res.json();
		createdKey = data.key;
		await afterSubmit();
	}

	async function copy() {
		if (!createdKey) return;
		await navigator.clipboard.writeText(createdKey);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function close() {
		open = false;
		reset();
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) reset();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		{#if createdKey === null}
			<Dialog.Header>
				<Dialog.Title>Create API Key</Dialog.Title>
				<Dialog.Description>
					Give the key a name (e.g. "amsterdam-agh") so you can identify it later.
				</Dialog.Description>
			</Dialog.Header>
			<form class="space-y-4" onsubmit={submit}>
				<div class="space-y-1.5">
					<Label for="key-name">Name</Label>
					<Input id="key-name" bind:value={name} placeholder="amsterdam-agh" />
				</div>
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
				<Dialog.Footer>
					<Button variant="outline" type="button" onclick={close}>Cancel</Button>
					<Button type="submit" disabled={!name.trim()}>Create</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<Dialog.Header>
				<Dialog.Title>API Key Created</Dialog.Title>
				<Dialog.Description>
					Copy your key now — it will <strong>not</strong> be shown again.
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-4">
				<div class="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
					<code class="text-foreground min-w-0 flex-1 break-all font-mono text-xs">{createdKey}</code>
					<Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={copy} aria-label="Copy key">
						{#if copied}
							<Check class="h-4 w-4 text-green-500" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</Button>
				</div>
				<p class="text-muted-foreground text-xs">
					Append <code class="bg-muted rounded px-1">?token=&lt;key&gt;</code> to any filter URL when
					configuring AdGuard Home.
				</p>
			</div>
			<Dialog.Footer>
				<Button onclick={close}>Done</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
