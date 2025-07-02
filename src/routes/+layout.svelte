<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/NavBar.svelte';
	let { children } = $props();
</script>

<NavBar />
<div class="p-4">
	{@render children()}
</div>
