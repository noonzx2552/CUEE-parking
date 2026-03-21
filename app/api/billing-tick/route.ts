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
      const warnFlex = {
        type: 'flex',
        altText: `⚠️ ช่อง ${session.slot_name} — เหลือเวลาจอดฟรีอีก ${remaining} วินาที`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box', layout: 'vertical', backgroundColor: '#d97706', paddingAll: '16px',
            contents: [
              { type: 'text', text: 'SmartPark', color: '#ffffff', weight: 'bold', size: 'lg' },
              { type: 'text', text: 'แจ้งเตือนก่อนหมดเวลาจอดฟรี', color: '#fde68a', size: 'xs' },
            ],
          },
          body: {
            type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
            contents: [
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: 'ช่องจอด', color: '#64748b', size: 'sm', flex: 1 },
                { type: 'text', text: session.slot_name, align: 'end', weight: 'bold', size: 'sm', color: '#1e293b' },
              ]},
              { type: 'separator' },
              { type: 'box', layout: 'horizontal', paddingTop: '8px', contents: [
                { type: 'text', text: 'เหลือเวลาฟรี', color: '#1e293b', size: 'md', weight: 'bold', flex: 1 },
                { type: 'text', text: `${remaining} วินาที`, align: 'end', weight: 'bold', size: 'md', color: '#d97706' },
              ]},
            ],
          },
          footer: {
            type: 'box', layout: 'vertical', backgroundColor: '#fffbeb', paddingAll: '10px',
            contents: [
              { type: 'text', text: '15 วินาทีแรกจอดฟรี หลังจากนั้นเริ่มคิดค่าบริการ', size: 'xs', color: '#92400e', align: 'center' },
            ],
          },
        },
      }
      await pushMessage(user_id, [warnFlex]).catch(() => {})
      await db.collection('parking_sessions').updateOne(
        { _id: session._id },
        { $set: { warned: true } }
      )
    }

    // Send billing notifications for each missed period
    if (isLineConfigured() && currentPeriod > lastNotifiedPeriod) {
      for (let p = lastNotifiedPeriod + 1; p <= currentPeriod; p++) {
        const periodFee = p * BILLING_RATE
        const periodElapsed = FREE_SECONDS + (p - 1) * BILLING_INTERVAL
        const m = Math.floor(periodElapsed / 60)
        const s = periodElapsed % 60
        const durationText = m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
        const billingFlex = {
          type: 'flex',
          altText: `⏱ ช่อง ${session.slot_name} — ค่าจอดสะสม ${periodFee} บาท (รอบที่ ${p})`,
          contents: {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#ea580c', paddingAll: '16px',
              contents: [
                { type: 'text', text: 'SmartPark', color: '#ffffff', weight: 'bold', size: 'lg' },
                { type: 'text', text: 'แจ้งเตือนค่าจอด', color: '#fed7aa', size: 'xs' },
              ],
            },
            body: {
              type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
              contents: [
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'ช่องจอด', color: '#64748b', size: 'sm', flex: 1 },
                  { type: 'text', text: session.slot_name, align: 'end', weight: 'bold', size: 'sm', color: '#1e293b' },
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'จอดมา', color: '#64748b', size: 'sm', flex: 1 },
                  { type: 'text', text: durationText, align: 'end', size: 'sm', color: '#1e293b' },
                ]},
                { type: 'separator' },
                { type: 'box', layout: 'horizontal', paddingTop: '8px', contents: [
                  { type: 'text', text: 'ค่าจอดสะสม', color: '#1e293b', size: 'md', weight: 'bold', flex: 1 },
                  { type: 'text', text: `${periodFee} บาท`, align: 'end', weight: 'bold', size: 'md', color: '#ea580c' },
                ]},
              ],
            },
            footer: {
              type: 'box', layout: 'vertical', backgroundColor: '#fff7ed', paddingAll: '10px',
              contents: [
                { type: 'text', text: `รอบที่ ${p} · กรุณาชำระเมื่อออกจากที่จอด`, size: 'xs', color: '#9a3412', align: 'center' },
              ],
            },
          },
        }
        await pushMessage(user_id, [billingFlex]).catch(() => {})
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
