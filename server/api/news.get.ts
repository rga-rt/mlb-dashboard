import type { NewsDay, NewsResponse, Transaction } from '~/types/mlb'
import { flattenTransaction, mlbFetch, pick } from '~/server/utils/mlb'

// GET /api/news?days=3
// Recent MLB roster transactions (all types) over the last N days (default 3,
// clamped 1-7), grouped by date newest-first. Straight from the /transactions
// feed; each move keeps its ready-made description plus player/team ids so the
// name can link to the player's stats. MLB-only — the feed is MLB-centric.
export default defineEventHandler(async (event): Promise<NewsResponse> => {
  const q = getQuery(event)
  // Clamp the window: "all transactions" is high-volume, so keep it bounded.
  const span = Math.min(Math.max(Number(q.days) || 3, 1), 7)
  const end = today()
  const start = addDays(end, -(span - 1))

  // Fail soft: an unreachable feed yields an empty board, not a 500.
  let raw: any
  try {
    raw = await mlbFetch<any>('/transactions', { sportId: 1, startDate: start, endDate: end })
  } catch {
    raw = {}
  }

  const byDate = new Map<string, Transaction[]>()
  for (const tx of (pick(raw, 'transactions', []) as any[])) {
    const flat = flattenTransaction(tx)
    if (!flat.date) continue
    if (!byDate.has(flat.date)) byDate.set(flat.date, [])
    byDate.get(flat.date)!.push(flat)
  }

  const days: NewsDay[] = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([date, transactions]) => ({ date, transactions }))

  return { start, end, days }
})

/** Today's date as YYYY-MM-DD, in the server's local zone. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Add `n` days (may be negative) to a YYYY-MM-DD string, returning YYYY-MM-DD. */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
