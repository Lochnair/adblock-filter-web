<script lang="ts">
	import { Select as BitsSelect } from 'bits-ui';

	let {
		value = $bindable(''),
		onValueChange,
		disabled = false,
		children
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<BitsSelect.Root
	type="single"
	{value}
	onValueChange={(v) => {
		if (v !== undefined) value = v;
		onValueChange?.(v ?? '');
	}}
	{disabled}
>
	{@render children?.()}
</BitsSelect.Root>
