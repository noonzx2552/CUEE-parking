import { createHmac, timingSafeEqual } from 'crypto'

export function validateSignedDeviceRequest(rawBody: string, headers: { get(name: string): string | null }): boolean {
  const apiKey = headers.get('x-api-key') || ''
  const timestamp = headers.get('x-timestamp') || ''
  const signature = headers.get('x-signature') || ''

  const expectedKey = process.env.DEVICE_API_KEY || ''
  if (!expectedKey || !apiKey) return false

  // Simple API key check (for Arduino/ESP32 devices)
  let keyMatch = false
  try {
    keyMatch = expectedKey.length === apiKey.length &&
      timingSafeEqual(Buffer.from(expectedKey), Buffer.from(apiKey))
  } catch { return false }
  if (!keyMatch) return false

  // If no HMAC headers provided, accept simple key auth
  if (!timestamp && !signature) return true

  // Full HMAC validation
  if (!timestamp || !signature) return false
  if (!/^\d+$/.test(timestamp)) return false

  const window = parseInt(process.env.DEVICE_HMAC_WINDOW_SECONDS || '300')
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > window) return false

  const expected = createHmac('sha256', apiKey).update(`${timestamp}.${rawBody}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch { return false }
}
