<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
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

<BitsTabs.List
	class={cn(
		'bg-muted text-muted-foreground inline-flex h-10 items-center justify-start rounded-md p-1',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</BitsTabs.List>
