<script lang="ts">
	import { Navbar, NavBrand, DarkMode } from 'flowbite-svelte';
</script>

<Navbar>
	<NavBrand href="/">
		<!--<img src="/images/flowbite-svelte-icon-logo.svg" class="me-3 h-6 sm:h-9" alt="Flowbite Logo" />-->
		<span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white"
			>Adblock DNS filters</span
		>
	</NavBrand>

	<DarkMode class="text-primary-500 dark:text-primary-600 border dark:border-gray-800" />
</Navbar>
