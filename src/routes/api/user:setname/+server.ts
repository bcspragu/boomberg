import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'
import { session } from '$lib/server/db/schema'
import { sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { name } = await request.json()

  if (name.length < MIN_NAME_LENGTH) {
    return json({
      error: `name must be at least ${MIN_NAME_LENGTH} characters` 
    })
  }
  if (name.length > MAX_NAME_LENGTH) {
    return json({
      error: `name must be at most ${MAX_NAME_LENGTH} characters` 
    })
  }

  if (hasInvalidCharacters(name)) {
    return json({
      error: 'name can only contain numbers, letters, and underscores' 
    })
  }

  await db.update(session).set({ name: name }).where(sql`${session.id} = ${locals.user.id}`)
  return json({
    newName: name,
  });
};

const MIN_NAME_LENGTH = 3
const MAX_NAME_LENGTH = 15

const hasInvalidCharacters = (name: string): boolean => {
  for (let i = 0; i < name.length; i++) {
    const charCode = name.charCodeAt(i);
    if (!(
      (charCode >= 48 && charCode <= 57) || // 0-9
      (charCode >= 65 && charCode <= 90) || // A-Z
      (charCode >= 97 && charCode <= 122) || // a-z
      charCode === 95 // underscore
    )) {
      return true;
    }
  }

  return false;
}

