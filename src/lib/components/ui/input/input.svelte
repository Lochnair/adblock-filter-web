<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		id,
		name,
		type = 'text',
		placeholder,
		value = $bindable(''),
		disabled = false,
		...restProps
	}: {
		class?: string;
		id?: string;
		name?: string;
		type?: string;
		placeholder?: string;
		value?: string;
		disabled?: boolean;
		[key: string]: unknown;
	} = $props();
</script>

<input
	{id}
	{name}
	{type}
	{placeholder}
	{disabled}
	bind:value
	class={cn(
		'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
/>
