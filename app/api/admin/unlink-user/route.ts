export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { getDb } from '@/lib/mongodb'

export async function POST(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { line_user_id } = await req.json()
    if (!line_user_id) return NextResponse.json({ error: 'Missing line_user_id' }, { status: 422 })

    const db = await getDb()

    // End all active sessions for this user
    const now = new Date().toISOString()
    await db.collection('parking_sessions').updateMany(
      { line_user_id, ended: false },
      { $set: { ended: true, ended_at: now, updated_at: now } }
    )

    // Remove from line_users
    const result = await db.collection('line_users').deleteOne({ line_user_id })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
