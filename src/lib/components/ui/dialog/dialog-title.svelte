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

<BitsDialog.Title
	class={cn('text-lg leading-none font-semibold tracking-tight', className)}
	{...restProps}
>
	{@render children?.()}
</BitsDialog.Title>
