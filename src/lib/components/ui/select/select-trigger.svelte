<script lang="ts">
	import { Select as BitsSelect } from 'bits-ui';
	import { ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		id,
		children,
		...restProps
	}: {
		class?: string;
		id?: string;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<BitsSelect.Trigger
	{id}
	class={cn(
		'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
		className
	)}
	{...restProps}
>
	<span>{@render children?.()}</span>
	<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
</BitsSelect.Trigger>
