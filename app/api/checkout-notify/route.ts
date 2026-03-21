export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { pushMessage, isLineConfigured } from '@/lib/line-client'

export async function POST(req: NextRequest) {
  try {
    const { user_id, slot, duration, fee, time_in, time_out } = await req.json()
    if (!user_id || !slot) return NextResponse.json({ error: 'Missing user_id or slot' }, { status: 422 })
    if (!isLineConfigured()) return NextResponse.json({ skipped: true })

    const feeNum = Number(fee) || 0
    const receiptMsg = {
      type: 'flex',
      altText: `SmartPark ขอบคุณที่ใช้บริการ — ค่าจอด ${feeNum} บาท`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#16a34a', paddingAll: '16px',
          contents: [
            { type: 'text', text: 'SmartPark', color: '#ffffff', weight: 'bold', size: 'lg' },
            { type: 'text', text: 'ใบเสร็จค่าจอดรถ', color: '#bbf7d0', size: 'xs' },
          ],
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
          contents: [
            {
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ช่องจอด', color: '#64748b', size: 'sm', flex: 1 },
                { type: 'text', text: slot, align: 'end', weight: 'bold', size: 'sm', color: '#1e293b' },
              ],
            },
            ...(time_in ? [{
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: 'เวลาเข้า', color: '#64748b', size: 'sm', flex: 1 },
                { type: 'text', text: time_in, align: 'end', size: 'sm', color: '#1e293b' },
              ],
            }] : []),
            ...(time_out ? [{
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: 'เวลาออก', color: '#64748b', size: 'sm', flex: 1 },
                { type: 'text', text: time_out, align: 'end', size: 'sm', color: '#1e293b' },
              ],
            }] : []),
            ...(duration ? [{
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ระยะเวลา', color: '#64748b', size: 'sm', flex: 1 },
                { type: 'text', text: duration, align: 'end', size: 'sm', color: '#1e293b' },
              ],
            }] : []),
            { type: 'separator' },
            {
              type: 'box', layout: 'horizontal', paddingTop: '8px',
              contents: [
                { type: 'text', text: 'ค่าจอดรวม', color: '#1e293b', size: 'md', weight: 'bold', flex: 1 },
                { type: 'text', text: `${feeNum.toLocaleString()} บาท`, align: 'end', weight: 'bold', size: 'md', color: '#16a34a' },
              ],
            },
          ],
        },
        footer: {
          type: 'box', layout: 'vertical', backgroundColor: '#f0fdf4', paddingAll: '12px',
          contents: [
            { type: 'text', text: '✅ ชำระเสร็จสิ้น', size: 'sm', color: '#16a34a', align: 'center', weight: 'bold' },
            { type: 'text', text: 'ขอบคุณที่ใช้บริการ SmartPark', size: 'xs', color: '#64748b', align: 'center', margin: 'sm' },
          ],
        },
      },
    }

    await pushMessage(user_id, [receiptMsg])
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
