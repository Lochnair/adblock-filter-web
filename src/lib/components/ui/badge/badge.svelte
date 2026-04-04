<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		variant = 'default' as 'default' | 'secondary' | 'destructive' | 'outline',
		children,
		...restProps
	}: {
		class?: string;
		variant?: 'default' | 'secondary' | 'destructive' | 'outline';
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();

	const variants = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/80',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
		outline: 'text-foreground border border-input'
	};
</script>

<div
	class={cn(
		'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
		variants[variant],
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
