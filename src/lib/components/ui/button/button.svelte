<script lang="ts">
	import { cn } from '$lib/utils';
	import { buttonVariants, type ButtonVariant, type ButtonSize } from './index';

	let {
		class: className = '',
		variant = 'default' as ButtonVariant,
		size = 'default' as ButtonSize,
		disabled = false,
		type = 'button' as 'button' | 'submit' | 'reset',
		onclick,
		children,
		...restProps
	}: {
		class?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</button>
