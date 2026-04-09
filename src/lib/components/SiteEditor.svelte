<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';

	let {
		open = $bindable(false),
		site = $bindable<{ id: number; slug: string; description: string; lists: string[] } | null>(
			null
		),
		availableLists = [] as string[],
		afterSubmit = $bindable(async () => {})
	} = $props();

	// Local copies — modified without touching the prop until Save.
	// eslint-disable-next-line svelte/prefer-writable-derived
	let selected = $state<string[]>([]);
	// eslint-disable-next-line svelte/prefer-writable-derived
	let description = $state('');

	$effect(() => {
		selected = site?.lists ? [...site.lists] : [];
		description = site?.description ?? '';
	});

	function toggle(slug: string) {
		if (selected.includes(slug)) {
			selected = selected.filter((s) => s !== slug);
		} else {
			selected = [...selected, slug];
		}
	}

	async function save() {
		if (!site) return;
		await Promise.all([
			fetch(`/api/sites/${site.slug}/lists`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lists: selected })
			}),
			fetch(`/api/sites/${site.slug}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description })
			})
		]);
		await afterSubmit();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Site — {site?.slug}</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<Label for="site-description">Description</Label>
				<Input
					id="site-description"
					bind:value={description}
					placeholder="Optional description"
				/>
			</div>
			<p class="text-sm font-medium">Assign filter lists</p>
			{#if availableLists.length === 0}
				<p class="text-muted-foreground text-sm">No lists exist yet. Create a list first.</p>
			{:else}
				<div class="space-y-2">
					{#each availableLists as listSlug (listSlug)}
						<label
							class="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors"
						>
							<input
								type="checkbox"
								class="accent-primary h-4 w-4 rounded border"
								checked={selected.includes(listSlug)}
								onchange={() => toggle(listSlug)}
							/>
							<span class="font-mono text-sm">{listSlug}</span>
						</label>
					{/each}
				</div>
			{/if}

			{#if selected.length > 0}
				<div class="flex flex-wrap gap-1 pt-1">
					{#each selected as s (s)}
						<Badge variant="secondary">{s}</Badge>
					{/each}
				</div>
			{/if}

			<p class="text-muted-foreground text-xs">
				Filter URL:
				<a
					href={resolve(`/filter/site/${site?.slug}.txt`)}
					target="_blank"
					class="text-primary font-mono underline underline-offset-2"
					>/filter/site/{site?.slug}.txt</a
				>
			</p>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={save}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
