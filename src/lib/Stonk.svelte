<script lang="ts">
  import { Stonk as StonkData } from '$lib/stonk'

  interface Props {
    ticker: string
    seed: string
  }

  let { ticker, seed }: Props = $props()

  let stonkData = new StonkData(seed)

  const scale = (domain: [number, number], range: [number, number]): ((v: number) => number) => {
    const m = (range[1] - range[0]) / (domain[1] - domain[0])
    return (value) => range[0] + m * (value - domain[0])
  }

  let w = $state(1)
  let h = $state(1)

  const x = $derived(scale([0, stonkData.data.length], [0, w]))
  const y = $derived(scale([stonkData.min, stonkData.max], [h, 0]))
</script>

<div class="relative h-full w-full bg-black text-green-400">
  <div class="absolute left-0 top-0">{ticker}</div>
  <svg width="100%" height="100%" bind:clientWidth={w} bind:clientHeight={h}>
    <polyline points={stonkData.data.map((d, i) => [x(i), y(d)]).join(' ')} />
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
