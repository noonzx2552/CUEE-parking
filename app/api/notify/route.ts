import { NextRequest, NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line-client'

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0 วินาที'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m} นาที ${s} วินาที`
  if (m > 0) return `${m} นาที`
  return `${s} วินาที`
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const userId = (data.user_id || '').trim()
    const slot = (data.slot || 'ไม่ระบุช่อง').trim()
    const type = (data.type || 'warn').trim()
    const remaining = parseInt(data.remaining || '0')

    if (!userId) return NextResponse.json({ status: 'error', message: 'User ID is required.' }, { status: 422 })

    let message: string
    if (type === 'billing') {
      const fee = parseInt(data.fee || '0')
      const period = parseInt(data.period || '1')
      message = `💳 ช่อง ${slot}\nค่าจอดสะสม ${fee} บาท\n(รอบที่ ${period} — เกินฟรี ${period * 20} วินาที)`
    } else if (type === 'expired') {
      message = `🚨 ช่อง ${slot}\nเวลาจอดหมดแล้ว กรุณานำรถออกทันที`
    } else {
      message = `⚠️ ช่อง ${slot}\nเหลือเวลาจอดอีก ${formatRemaining(remaining)}`
    }

    await pushMessage(userId, [{ type: 'text', text: message }])
    return NextResponse.json({ status: 'success' })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 })
  }
}
