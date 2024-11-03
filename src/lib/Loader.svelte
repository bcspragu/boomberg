<script lang="ts">
  import { onMount } from 'svelte'

  // const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  // const spinner = ['[   ]', '[=  ]', '[== ]', '[===]', '[ ==]', '[  =]']
  const spinner = ['[·  ]', '[·· ]', '[···]', '[ ··]', '[  ·]', '[   ]']

  let i = $state(0)
  let c = $derived(spinner[i])

  onMount(() => {
    const timer = setInterval(() => {
      i = (i + 1) % spinner.length
    }, 150)

    return () => {
      clearInterval(timer)
    }
  })
</script>

<span>{c}&nbsp;</span>
