export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { getDb } from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500)
    const db = await getDb()

    // Merge parking sessions + slot updates as a unified activity log
    const sessions = await db.collection('parking_sessions')
      .find({})
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    const logs = sessions.map(s => {
      const events = []
      events.push({
        time: s.start_time || s.created_at,
        type: 'enter',
        slot: s.slot_name,
        user: s.line_user_id || s.user_id || '-',
        source: s.source || 'system',
        note: 'รถเข้า',
      })
      if (s.ended && s.ended_at) {
        events.push({
          time: s.ended_at,
          type: 'exit',
          slot: s.slot_name,
          user: s.line_user_id || s.user_id || '-',
          source: s.source || 'system',
          note: 'รถออก',
        })
      }
      return events
    })

    const flat = logs.flat().sort((a, b) => b.time.localeCompare(a.time)).slice(0, limit)
    return NextResponse.json({ logs: flat })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
