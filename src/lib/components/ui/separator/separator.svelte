<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		orientation = 'horizontal' as 'horizontal' | 'vertical',
		...restProps
	}: {
		class?: string;
		orientation?: 'horizontal' | 'vertical';
		[key: string]: unknown;
	} = $props();
</script>

<div
	role="separator"
	class={cn(
		'bg-border shrink-0',
		orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
		className
	)}
	{...restProps}
></div>
