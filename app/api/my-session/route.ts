export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getActiveSessionByUserId } from '@/lib/parking-repository'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id') || ''
    if (!userId) return NextResponse.json({ session: null })

    const session = await getActiveSessionByUserId(userId)
    if (!session) return NextResponse.json({ session: null })

    return NextResponse.json({
      session: {
        slot: session.slot_name,
        startTime: session.start_time,
      },
    })
  } catch {
    return NextResponse.json({ session: null })
  }
}
