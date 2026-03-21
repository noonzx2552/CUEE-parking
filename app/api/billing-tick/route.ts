export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getActiveSessionByUserId } from '@/lib/parking-repository'
import { pushMessage, isLineConfigured } from '@/lib/line-client'
import { getDb } from '@/lib/mongodb'

const FREE_SECONDS = 15
const BILLING_INTERVAL = 20
const BILLING_RATE = 20

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 422 })

    const session = await getActiveSessionByUserId(user_id)
    if (!session) return NextResponse.json({ active: false })

    const startTime = new Date(session.start_time).getTime()
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const lastNotifiedPeriod: number = session.last_notified_period ?? 0
    const alreadyWarned: boolean = session.warned ?? false

    let currentPeriod = 0
    let fee = 0

    if (elapsed > FREE_SECONDS) {
      const overTime = elapsed - FREE_SECONDS
      currentPeriod = 1 + Math.floor(overTime / BILLING_INTERVAL)
      fee = currentPeriod * BILLING_RATE
    }

    const db = await getDb()

    // Send warn notification once before free period ends
    if (!alreadyWarned && elapsed >= 10 && elapsed < FREE_SECONDS && isLineConfigured()) {
      const remaining = FREE_SECONDS - elapsed
      await pushMessage(user_id, [{
        type: 'text',
        text: `⚠️ ช่อง ${session.slot_name}\nเหลือเวลาจอดฟรีอีก ${remaining} วินาที`,
      }]).catch(() => {})
      await db.collection('parking_sessions').updateOne(
        { _id: session._id },
        { $set: { warned: true } }
      )
    }

    // Send billing notifications for each missed period
    if (isLineConfigured() && currentPeriod > lastNotifiedPeriod) {
      for (let p = lastNotifiedPeriod + 1; p <= currentPeriod; p++) {
        const periodFee = p * BILLING_RATE
        // Calculate elapsed at the moment this period started
        const periodElapsed = FREE_SECONDS + (p - 1) * BILLING_INTERVAL
        const m = Math.floor(periodElapsed / 60)
        const s = periodElapsed % 60
        const duration = m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
        await pushMessage(user_id, [{
          type: 'text',
          text: `⏱ ช่อง ${session.slot_name} — จอดมา ${duration}\n💰 ค่าจอดสะสม ${periodFee} บาท (รอบที่ ${p})\nกรุณาชำระเมื่อออกจากที่จอด`,
        }]).catch(() => {})
      }
      await db.collection('parking_sessions').updateOne(
        { _id: session._id },
        { $set: { last_notified_period: currentPeriod } }
      )
    }

    const nextIn = elapsed < FREE_SECONDS
      ? FREE_SECONDS - elapsed
      : BILLING_INTERVAL - ((elapsed - FREE_SECONDS) % BILLING_INTERVAL)

    return NextResponse.json({ active: true, elapsed, fee, period: currentPeriod, nextIn })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
