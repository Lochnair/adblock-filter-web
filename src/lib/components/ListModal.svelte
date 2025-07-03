<script lang="ts">
	import { Modal, Button, Label, Input, Alert } from 'flowbite-svelte';

	let { open = $bindable(false), afterSubmit = $bindable(async () => {}) } = $props();

	let slug = $state('');
	let error = $state('');
	const slugRegex = /^[a-z0-9-]+$/i;
	let slugError: string | null = $derived(slug && slugRegex.test(slug) ? null : 'invalid slug');
	let displayError: string | null = $derived(slugError || error || null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (slugError) {
			return;
		}
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

<Modal bind:open onclose={() => (error = '')}>
	<form class="space-y-4" onsubmit={submit}>
		<div>
			<Label for="list-slug">List Slug</Label>
			<Input id="list-slug" bind:value={slug} placeholder="new list slug" />
		</div>
		{#if displayError}
			<Alert color="failure" class="mt-2">{displayError}</Alert>
		{/if}
		<div class="flex justify-end gap-2">
			<Button color="gray" type="button" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={slugError}>Create List</Button>
		</div>
	</form>
</Modal>
