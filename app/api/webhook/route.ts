import { NextRequest, NextResponse } from 'next/server'
import { getSlots } from '@/lib/parking-repository'
import { isLineConfigured, replyText } from '@/lib/line-client'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.events?.length || !isLineConfigured()) return NextResponse.json({ status: 'ok' })

    const slots = await getSlots()
    const vacant = slots.filter(s => s.status === 'vacant').length
    const occupied = slots.filter(s => s.status === 'occupied').length

    for (const event of data.events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue
      const replyToken = event.replyToken || ''
      const msg = (event.message?.text || '').trim().toLowerCase()
      if (!replyToken || !msg) continue

      let reply: string
      if (msg.includes('สถานะ') || msg.includes('ว่าง') || msg.includes('status') || msg === '?') {
        const lines = ['SmartPark Status', `อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`, '']
        for (const s of slots) {
          lines.push((s.status === 'vacant' ? '🟢 ' : '🔴 ') + s.slot_name + ' - ' + (s.status === 'vacant' ? 'ว่าง' : 'ไม่ว่าง'))
        }
        lines.push('', `ว่าง ${vacant} ช่อง | ไม่ว่าง ${occupied} ช่อง`)
        reply = lines.join('\n')
      } else if (msg.includes('ราคา') || msg.includes('ค่าจอด')) {
        reply = 'ค่าจอด SmartPark\n30 วินาทีแรก 20 บาท\nหลังจากนั้น +20 บาท ทุก 15 วินาที'
      } else if (msg.includes('วิธีใช้') || msg.includes('help') || msg.includes('ช่วย')) {
        reply = 'วิธีใช้ SmartPark\n1. สแกน QR ทางเข้า\n2. เพิ่ม LINE และเลือกช่องจอด\n3. รับแจ้งเตือนผ่าน LINE\n4. แสดง QR ตอนออก'
      } else {
        reply = `SmartPark Bot\nตอนนี้มีช่องว่าง ${vacant} ช่อง\nพิมพ์ 'สถานะ' เพื่อดูทุกช่อง`
      }
      await replyText(replyToken, reply)
    }
    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 })
  }
}
