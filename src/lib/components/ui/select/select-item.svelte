<script lang="ts">
	import { Select as BitsSelect } from 'bits-ui';
	import { Check } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		value,
		label,
		disabled = false,
		...restProps
	}: {
		class?: string;
		value: string;
		label?: string;
		disabled?: boolean;
		[key: string]: unknown;
	} = $props();
</script>

<BitsSelect.Item
	{value}
	{disabled}
	class={cn(
		'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...restProps}
>
	{#snippet children({ selected })}
		<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if selected}
				<Check class="h-4 w-4" />
			{/if}
		</span>
		{label ?? value}
	{/snippet}
</BitsSelect.Item>
