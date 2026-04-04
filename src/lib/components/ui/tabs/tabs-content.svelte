<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		value,
		children,
		...restProps
	}: {
		class?: string;
		value: string;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<BitsTabs.Content
	{value}
	class={cn(
		'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</BitsTabs.Content>
