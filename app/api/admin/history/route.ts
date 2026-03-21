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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)
    const db = await getDb()
    const sessions = await db.collection('parking_sessions')
      .find({})
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    const lineUsers = await db.collection('line_users').find({}).toArray()
    const userMap: Record<string, string> = {}
    for (const u of lineUsers) userMap[u.line_user_id] = u.display_name || u.line_user_id

    const result = sessions.map(s => ({
      ...s,
      user_name: s.line_user_id ? (userMap[s.line_user_id] || s.line_user_id) : '-',
    }))

    return NextResponse.json({ sessions: result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
