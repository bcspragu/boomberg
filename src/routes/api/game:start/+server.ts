import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRandomTicker } from '$lib/tickers'

export const POST: RequestHandler = async ({ request: _request, locals }) => {
  const t = getRandomTicker()
	return json({
	  code: t.ticker,
	  desc: t.company,
	})
};
