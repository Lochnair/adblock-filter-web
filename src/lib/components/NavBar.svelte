<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	onMount(() => {
		if (localStorage.getItem('theme') === 'dark') {
			document.documentElement.classList.add('dark');
		}
	});

	function toggleDark() {
		const isDark = document.documentElement.classList.toggle('dark');
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}
</script>

<nav class="border-border bg-background border-b px-4 py-3">
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<a href="/" class="text-foreground text-xl font-semibold">Adblock DNS Filters</a>
		<Button variant="ghost" size="icon" onclick={toggleDark} aria-label="Toggle dark mode">
			<Sun class="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
			<Moon
				class="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
			/>
		</Button>
	</div>
</nav>
