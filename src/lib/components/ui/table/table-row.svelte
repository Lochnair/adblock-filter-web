<script lang="ts">
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

<tr
	class={cn(
		'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
