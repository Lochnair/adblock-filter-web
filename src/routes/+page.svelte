<script lang="ts">
       import { onMount } from 'svelte';

       interface Record {
               id: number;
               name: string;
               type: string;
               value: string;
       }

       let records: Record[] = [];
       let name = '';
       let type = 'A';
       let value = '';

       async function load() {
               const res = await fetch('/api/records');
               records = await res.json();
       }

       async function create() {
               await fetch('/api/records', {
                       method: 'POST',
                       headers: { 'content-type': 'application/json' },
                       body: JSON.stringify({ name, type, value })
               });
               name = '';
               value = '';
               await load();
       }

       onMount(load);
</script>

<h1 class="text-2xl font-bold mb-4">DNS Records</h1>
<form on:submit|preventDefault={create} class="space-y-2">
       <input class="border p-1" bind:value={name} placeholder="hostname" />
       <select class="border p-1" bind:value={type}>
               <option>A</option>
               <option>AAAA</option>
               <option>CNAME</option>
               <option>HTTPS</option>
               <option>MX</option>
               <option>PTR</option>
               <option>SRV</option>
               <option>TXT</option>
       </select>
       <input class="border p-1" bind:value={value} placeholder="value" />
       <button class="bg-blue-500 text-white px-2 py-1">Add</button>
</form>

<ul class="mt-4 space-y-1">
       {#each records as r (r.id)}
               <li>{r.name} {r.type} {r.value}</li>
       {/each}
</ul>
