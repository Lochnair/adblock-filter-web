<script lang="ts">
	let {
		placeholder = ''
	}: {
		placeholder?: string;
	} = $props();
</script>

<!-- Placeholder is handled by the trigger's children -->
<span data-placeholder={placeholder}></span>
