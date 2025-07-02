<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavHamburger, NavUl, NavLi } from 'flowbite-svelte';

	let { children } = $props();
</script>

<Navbar let:toggle let:hidden class="mb-4 border-b">
	<NavBrand href="/" class="text-xl font-semibold">DNS Tool</NavBrand>
	<NavHamburger on:click={toggle} class="ml-auto md:hidden" />
	<NavUl class:hidden class="ml-auto flex flex-col md:flex-row">
		<NavLi href="/filter.txt" class="px-2 py-1">Filter</NavLi>
	</NavUl>
</Navbar>

<div class="p-4">
	{@render children()}
</div>
