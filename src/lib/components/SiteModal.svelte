<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let {
		open = $bindable(false),
		afterSubmit = $bindable(async () => {})
	} = $props();

	let slug = $state('');
	let description = $state('');
	let error = $state('');

	const slugError: string | null = $derived(
		slug && /^[a-z0-9-]+$/i.test(slug) ? null : 'invalid slug'
	);
	const displayError: string | null = $derived(slugError || error || null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (slugError) return;
		const res = await fetch('/api/sites', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug, description })
		});
		if (!res.ok) {
			error = await res.text();
			return;
		}
		slug = '';
		description = '';
		await afterSubmit();
		open = false;
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) error = ''; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create Site</Dialog.Title>
			<Dialog.Description>
				A site groups one or more filter lists. Each site gets its own filter URL.
			</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-4" onsubmit={submit}>
			<div class="space-y-1.5">
				<Label for="site-slug">Site Slug</Label>
				<Input id="site-slug" bind:value={slug} placeholder="amsterdam" />
				<p class="text-muted-foreground text-xs">Used in the filter URL: /filter/site/amsterdam.txt</p>
			</div>
			<div class="space-y-1.5">
				<Label for="site-desc">Description <span class="text-muted-foreground">(optional)</span></Label>
				<Input id="site-desc" bind:value={description} placeholder="Dutch datacenter" />
			</div>
			{#if displayError}
				<p class="text-destructive text-sm">{displayError}</p>
			{/if}
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={slugError !== null}>Create Site</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
