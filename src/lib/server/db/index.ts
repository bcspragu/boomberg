import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { DATABASE_URL } from '$env/static/private'
import * as schema from '$lib/server/db/schema'
import { sql } from 'drizzle-orm'

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')
const client = new Database(DATABASE_URL)
export const db = drizzle(client, { schema })

db.run(sql`PRAGMA journal_mode=WAL`)
db.run(sql`PRAGMA foreign_keys=1`)    // Enable foreign keys
db.run(sql`PRAGMA busy_timeout=1000`) // 1000ms
db.run(sql`PRAGMA synchronous=1`)     // NORMAL, see https://www.sqlite.org/pragma.html#pragma_synchronous
