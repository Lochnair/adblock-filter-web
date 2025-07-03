<script lang="ts">
	import { Modal, Button, Label, Input } from 'flowbite-svelte';

	let { open = $bindable(false), afterSubmit = $bindable(async () => {}) } = $props();

	let slug = $state('');
	let error = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
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
		{#if error}
			<p class="text-red-600">{error}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button color="gray" type="button" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit">Create List</Button>
		</div>
	</form>
</Modal>
