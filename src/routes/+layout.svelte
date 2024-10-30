<script lang="ts">
  import { type Snippet } from 'svelte'
  import '../app.css'
  import type { LayoutData } from './$types'
  import { setUser } from '$lib/context/user.svelte'

  let { data, children }: { data: LayoutData; children: Snippet } = $props()

  setUser(data.user)
</script>

{@render children()}
