import {randomBytes} from 'crypto';
import tickers from '../data/ticker_pairs.json'

const MAX_UINT32 = 4294967295; // 2 ** 32 - 1
const SAFETY_COUNT = 15;

interface Ticker {
  ticker: string
  company: string
}

export const getRandomTicker = (): Ticker => {
  if (tickers.length === 0) {
    throw new Error('`tickers` was never initialized!');
  }
                                                                                                                                                                        
  // For rejection sampling, reject the end of the range
  const limit = MAX_UINT32 - (MAX_UINT32 % tickers.length);

  for (let i = 0; i < SAFETY_COUNT; i++) {
    const rb = randomBytes(4);
    const randomNumber = rb.readUInt32BE(0);

    if (randomNumber < limit) {
      const ticker = tickers[randomNumber % tickers.length];
      if (ticker.length !== 2) {
        throw new Error(`expected ticker to have two entries, got ${ticker.length}`)
      }
      return {
        ticker: ticker[0],
        company: ticker[1],
      }
    }
    // If randomNumber >= limit, we reject it and try again, up to our safety limit.
  }

  // Should be **extremely** unlikely
  throw new Error(`hit limit ${SAFETY_COUNT} times in a row, ${limit}`)
}
