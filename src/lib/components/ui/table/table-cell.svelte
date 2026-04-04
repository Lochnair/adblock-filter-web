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

<td class={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...restProps}>
	{@render children?.()}
</td>
