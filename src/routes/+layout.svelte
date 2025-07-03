<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/NavBar.svelte';
	let { children } = $props();
</script>

<div class="container mx-auto">
	<NavBar />
	{@render children()}
</div>
