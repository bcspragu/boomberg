<script lang="ts">
	import Terminal from "../lib/Terminal.svelte";
	import type { PageData } from './$types';

	export let data: PageData;

</script>

<Terminal name={data.username} />
