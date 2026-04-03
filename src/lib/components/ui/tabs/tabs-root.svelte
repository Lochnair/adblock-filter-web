<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		value = $bindable(''),
		onValueChange,
		children,
		...restProps
	}: {
		class?: string;
		value?: string;
		onValueChange?: (value: string) => void;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<BitsTabs.Root
	bind:value
	onValueChange={(v) => onValueChange?.(v)}
	class={cn('', className)}
	{...restProps}
>
	{@render children?.()}
</BitsTabs.Root>
