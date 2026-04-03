<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { open = $bindable(false), afterSubmit = $bindable(async () => {}) } = $props();

	let slug = $state('');
	let error = $state('');
	const slugRegex = /^[a-z0-9-]+$/i;
	let slugError: string | null = $derived(slug && slugRegex.test(slug) ? null : 'invalid slug');
	let displayError: string | null = $derived(slugError || error || null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (slugError) return;
		const res = await fetch('/api/lists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug })
		});
		if (!res.ok) {
			error = await res.text();
			return;
		}
		slug = '';
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
			<Dialog.Title>Create Filter List</Dialog.Title>
		</Dialog.Header>
		<form class="space-y-4" onsubmit={submit}>
			<div class="space-y-1.5">
				<Label for="list-slug">List Slug</Label>
				<Input id="list-slug" bind:value={slug} placeholder="my-list" />
			</div>
			{#if displayError}
				<p class="text-destructive text-sm">{displayError}</p>
			{/if}
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={slugError !== null}>Create List</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
