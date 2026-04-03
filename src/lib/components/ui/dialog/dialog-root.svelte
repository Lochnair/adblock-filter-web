<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';

	let {
		open = $bindable(false),
		onOpenChange,
		children
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<BitsDialog.Root
	bind:open
	onOpenChange={(v) => {
		open = v;
		onOpenChange?.(v);
	}}
>
	{@render children?.()}
</BitsDialog.Root>
