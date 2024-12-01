import seedrandom from 'seedrandom'

export class Stonk {
  rng: seedrandom.PRNG
  winds: number[]
  volatilities: number[]
  public data: number[]

  overallTrajectory: number
  initialValue: number

  numWinds = 20
  numVolatilities = 20

  public min: number
  public max: number

  constructor(seed: string) {
    this.rng = seedrandom(seed)

    this.winds = this.initWinds()
    this.volatilities = this.initVolatilities()
    // Biased positive, most stonks should gain value over time
    this.overallTrajectory = this.rng.double() - 0.25
    this.initialValue = this.rng.double() * this.rng.double() * 1000
    const [data, min, max] = this.initPoints()
    this.data = data
    this.min = min
    this.max = max
  }

  initWinds(): number[] {
    const winds = []
    for (let i = 0; i < this.numWinds; i++) {
      winds.push((this.rng.double() - 0.5) / 50)
    }
    return winds
  }

  initVolatilities(): number[] {
    const volatilities = []
    for (let i = 0; i < this.numVolatilities; i++) {
      volatilities.push(this.rng.double() / 50)
    }
    return volatilities
  }

  initPoints(): [number[], number, number] {
    // Current 'acceleration', so to speak
    let trajectory = 0.0
    let previous = this.initialValue

    const calcNext = (wind: number, jitter: number, volatility: number) => {
      if (previous === 0) {
        return 0
      }
      const maybeValue = previous * (1 + trajectory) + jitter * previous * volatility
      const value = Math.max(maybeValue, 0)
      previous = value
      trajectory += wind + this.overallTrajectory / 100
      // trajectory should tend to decay towards zero
      trajectory *= 0.9

      return value
    }

    const data = []
    let min = Number.MAX_SAFE_INTEGER
    let max = Number.MIN_SAFE_INTEGER
    for (let i = 0; i < 100; i += 1) {
      const wind = this.winds[Math.floor(i / this.numWinds)]
      const volatility = this.volatilities[Math.floor(i / this.numVolatilities)]
      const jitter = (this.rng.double() * 10 - 5) * (this.rng.double() * 10 - 5)
      const value = calcNext(wind, jitter, volatility)
      if (value < min) {
        min = value
      }
      if (value > max) {
        max = value
      }
      data.push(value)
    }
    return [data, min, max]
  }
}
