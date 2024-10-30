import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async () => {
  console.log('JOIN GAME')
  return json({})
}
