export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSlots } from '@/lib/parking-repository'
import { isLineConfigured, replyText } from '@/lib/line-client'

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

      let reply: string

      if (slotsError) {
        reply = 'SmartPark Bot\nขณะนี้ระบบกำลังปรับปรุง กรุณาลองใหม่อีกครั้ง'
      } else if (msg.includes('สถานะ') || msg.includes('ว่าง') || msg.includes('status') || msg === '?') {
        const lines = ['SmartPark Status', `อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`, '']
        for (const s of slots) {
          lines.push((s.status === 'vacant' ? '🟢 ' : '🔴 ') + s.slot_name + ' - ' + (s.status === 'vacant' ? 'ว่าง' : 'ไม่ว่าง'))
        }
        lines.push('', `ว่าง ${vacant} ช่อง | ไม่ว่าง ${occupied} ช่อง`)
        reply = lines.join('\n')
      } else if (msg.includes('ราคา') || msg.includes('ค่าจอด')) {
        reply = 'ค่าจอด SmartPark\n15 วินาทีแรก ฟรี\nหลังจากนั้น +20 บาท ทุก 20 วินาที'
      } else if (msg.includes('วิธีใช้') || msg.includes('help') || msg.includes('ช่วย') || msg.includes('menu') || msg.includes('เมนู')) {
        reply = 'วิธีใช้ SmartPark\n1. สแกน QR ทางเข้า\n2. เพิ่ม LINE และเลือกช่องจอด\n3. รับแจ้งเตือนผ่าน LINE\n4. แสดง QR ตอนออก\n\nพิมพ์คำสั่งได้เลย:\n• "สถานะ" - ดูช่องจอดว่าง\n• "ราคา" - ดูค่าจอด\n• "วิธีใช้" - วิธีการใช้งาน'
      } else {
        reply = `SmartPark Bot\nตอนนี้มีช่องว่าง ${vacant} ช่อง\n\nพิมพ์คำสั่ง:\n• "สถานะ" - ดูช่องจอดทั้งหมด\n• "ราคา" - ดูค่าจอด\n• "วิธีใช้" - วิธีการใช้งาน`
      }

      try {
        await replyText(replyToken, reply)
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
