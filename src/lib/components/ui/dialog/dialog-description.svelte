<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		children,
		...restProps
	}: {
		class?: string;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<BitsDialog.Description class={cn('text-muted-foreground text-sm', className)} {...restProps}>
	{@render children?.()}
</BitsDialog.Description>
