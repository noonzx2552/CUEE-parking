const LINE_API = 'https://api.line.me/v2/bot/message'

async function lineRequest(endpoint: string, payload: object) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured.')
  const res = await fetch(`${LINE_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || 'LINE API error')
  }
  return res.json()
}

export function isLineConfigured() {
  return !!process.env.LINE_CHANNEL_ACCESS_TOKEN
}

export function pushMessage(userId: string, messages: object[]) {
  return lineRequest('push', { to: userId, messages })
}

export function replyText(replyToken: string, text: string) {
  return lineRequest('reply', { replyToken, messages: [{ type: 'text', text }] })
}

export function pushParkingTicket(userId: string, slot: string, entranceTime: string) {
  const message = {
    type: 'flex',
    altText: 'SmartPark E-Parking Ticket',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#2563eb',
        contents: [
          { type: 'text', text: 'SMART PARK', color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: 'E-Parking Ticket', color: '#dbeafe', size: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'Slot', color: '#6b7280', size: 'sm' },
            { type: 'text', text: slot, align: 'end', weight: 'bold', size: 'sm' },
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'Entrance', color: '#6b7280', size: 'sm' },
            { type: 'text', text: `${entranceTime} น.`, align: 'end', weight: 'bold', size: 'sm' },
          ]},
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'text', text: 'ระบบจะส่งแจ้งเตือนเวลาจอดผ่าน LINE', size: 'xs', color: '#6b7280', align: 'center' }],
      },
    },
  }
  return pushMessage(userId, [message])
}
