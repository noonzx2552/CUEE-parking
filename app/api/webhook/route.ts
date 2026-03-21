export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSlots } from '@/lib/parking-repository'
import { isLineConfigured, replyText, replyMessage } from '@/lib/line-client'

export async function POST(req: NextRequest) {
  // Always return 200 to LINE immediately — errors must not cause 4xx/5xx
  try {
    const data = await req.json()
    if (!data.events?.length || !isLineConfigured()) return NextResponse.json({ status: 'ok' })

    let slots: { slot_name: string; status: string }[] = []
    let slotsError = false
    try {
      slots = await getSlots()
    } catch {
      slotsError = true
    }

    const vacant = slots.filter(s => s.status === 'vacant').length
    const occupied = slots.filter(s => s.status === 'occupied').length

    for (const event of data.events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue
      const replyToken = event.replyToken || ''
      const msg = (event.message?.text || '').trim().toLowerCase()
      if (!replyToken || !msg) continue

      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

      try {
        if (slotsError) {
          await replyText(replyToken, 'SmartPark Bot\nขณะนี้ระบบกำลังปรับปรุง กรุณาลองใหม่อีกครั้ง')
        } else if (msg.includes('สถานะ') || msg.includes('ว่าง') || msg.includes('status') || msg === '?') {
          const slotRows = slots.map(s => ({
            type: 'box', layout: 'horizontal', paddingTop: '8px', paddingBottom: '8px',
            contents: [
              { type: 'box', layout: 'vertical', width: '12px', height: '12px', cornerRadius: '6px',
                backgroundColor: s.status === 'vacant' ? '#22c55e' : '#ef4444',
                contents: [], flex: 0 },
              { type: 'text', text: s.slot_name, size: 'sm', weight: 'bold', color: '#1e293b', margin: 'md', flex: 1 },
              { type: 'text', text: s.status === 'vacant' ? 'ว่าง' : 'ไม่ว่าง',
                size: 'sm', color: s.status === 'vacant' ? '#16a34a' : '#dc2626', align: 'end', weight: 'bold' },
            ],
          }))
          const flexMsg = {
            type: 'flex', altText: `SmartPark Status — ว่าง ${vacant} ช่อง`,
            contents: {
              type: 'bubble',
              header: {
                type: 'box', layout: 'vertical', backgroundColor: '#2563eb', paddingAll: '16px',
                contents: [
                  { type: 'text', text: 'SmartPark', color: '#ffffff', weight: 'bold', size: 'lg' },
                  { type: 'text', text: 'สถานะที่จอดรถ', color: '#bfdbfe', size: 'xs' },
                ],
              },
              body: {
                type: 'box', layout: 'vertical', spacing: 'none', paddingAll: '16px',
                contents: [
                  ...slotRows,
                  { type: 'separator', margin: 'md' },
                  { type: 'box', layout: 'horizontal', margin: 'md',
                    contents: [
                      { type: 'text', text: `🟢 ว่าง ${vacant} ช่อง`, size: 'xs', color: '#16a34a', flex: 1 },
                      { type: 'text', text: `🔴 ไม่ว่าง ${occupied} ช่อง`, size: 'xs', color: '#dc2626', align: 'end', flex: 1 },
                    ],
                  },
                ],
              },
              footer: {
                type: 'box', layout: 'vertical', backgroundColor: '#f8fafc', paddingAll: '10px',
                contents: [
                  { type: 'text', text: `อัปเดตล่าสุด ${now} น.`, size: 'xs', color: '#94a3b8', align: 'center' },
                ],
              },
            },
          }
          await replyMessage(replyToken, [flexMsg])
        } else if (msg.includes('ราคา') || msg.includes('ค่าจอด')) {
          await replyText(replyToken, 'ค่าจอด SmartPark\n15 วินาทีแรก ฟรี\nหลังจากนั้น +20 บาท ทุก 20 วินาที')
        } else if (msg.includes('วิธีใช้') || msg.includes('help') || msg.includes('ช่วย') || msg.includes('menu') || msg.includes('เมนู')) {
          await replyText(replyToken, 'วิธีใช้ SmartPark\n1. สแกน QR ทางเข้า\n2. เพิ่ม LINE และเลือกช่องจอด\n3. รับแจ้งเตือนผ่าน LINE\n4. แสดง QR ตอนออก\n\nพิมพ์คำสั่งได้เลย:\n• "สถานะ" - ดูช่องจอดว่าง\n• "ราคา" - ดูค่าจอด\n• "วิธีใช้" - วิธีการใช้งาน')
        } else {
          await replyText(replyToken, `SmartPark Bot\nตอนนี้มีช่องว่าง ${vacant} ช่อง\n\nพิมพ์คำสั่ง:\n• "สถานะ" - ดูช่องจอดทั้งหมด\n• "ราคา" - ดูค่าจอด\n• "วิธีใช้" - วิธีการใช้งาน`)
        }
      } catch {
        // Reply failed (e.g. expired token) — log but don't break the loop
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    // Return 200 so LINE doesn't disable the webhook
    return NextResponse.json({ status: 'ok' })
  }
}
