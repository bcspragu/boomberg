<script lang="ts">
  // Note: This component borrows heavily from https://svelte.dev/tutorial/svelte/raw-state
  let previous = $state(50)

  const next = () => {
    const value = previous + Math.random() - 0.4
    previous = value

    return value
  }
  const scale = (domain: [number, number], range: [number, number]): ((v: number) => number) => {
    const m = (range[1] - range[0]) / (domain[1] - domain[0])
    return (value) => range[0] + m * (value - domain[0])
  }

  const data: number[] = $state([])
  for (let i = 0; i < 100; i += 1) {
    data.push(next())
  }

  // TODO: If performance is bad here, replace with min/max $state updated when data updates.
  const min = $derived(Math.min(...data) - 5)
  const max = $derived(Math.max(...data) + 5)

  let w = $state(1)
  let h = $state(1)

  const x = $derived(scale([0, data.length], [0, w]))
  const y = $derived(scale([min, max], [h, 0]))
</script>

<div class="h-full w-full bg-black text-green-400">
  <svg width="100%" height="100%" bind:clientWidth={w} bind:clientHeight={h}>
    <polyline points={data.map((d, i) => [x(i), y(d)]).join(' ')} />
  </svg>
</div>

<style>
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  polyline {
    fill: none;
    stroke: theme('colors.green.400');
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
