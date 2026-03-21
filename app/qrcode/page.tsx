'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

const ROTATE_SECONDS = 30

function getToken() {
  // เปลี่ยนทุก ROTATE_SECONDS วินาที
  return Math.floor(Date.now() / (ROTATE_SECONDS * 1000)).toString(36)
}

function getCountdown() {
  const elapsed = Math.floor(Date.now() / 1000) % ROTATE_SECONDS
  return ROTATE_SECONDS - elapsed
}

export default function QrCodePage() {
  const qrRef = useRef<HTMLDivElement>(null)
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<{ slot_name: string; status: string }[]>([])
  const [countdown, setCountdown] = useState(getCountdown())
  const [fading, setFading] = useState(false)
  const sdkLoaded = useRef(false)
  const lastToken = useRef('')

  const generateQR = useCallback((token: string) => {
    if (!qrRef.current || !sdkLoaded.current) return
    const url = window.location.origin + '/login?t=' + token
    qrRef.current.innerHTML = ''
    new window.QRCode(qrRef.current, {
      text: url, width: 220, height: 220,
      colorDark: '#000', colorLight: '#fff', correctLevel: 1,
    })
    lastToken.current = token
  }, [])

  // Load QRCode SDK once
  useEffect(() => {
    if (document.querySelector('script[data-qr]')) {
      sdkLoaded.current = true
      generateQR(getToken())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.setAttribute('data-qr', '1')
    script.onload = () => {
      sdkLoaded.current = true
      generateQR(getToken())
    }
    document.head.appendChild(script)
  }, [generateQR])

  // Clock + countdown + auto-rotate
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('th-TH'))
      const cd = getCountdown()
      setCountdown(cd)

      const tok = getToken()
      if (tok !== lastToken.current && sdkLoaded.current) {
        // Fade out → regenerate → fade in
        setFading(true)
        setTimeout(() => {
          generateQR(tok)
          setFading(false)
        }, 400)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [generateQR])

  // Slot status polling
  useEffect(() => {
    const load = () =>
      fetch('/api/get-status').then(r => r.json())
        .then(d => { if (Array.isArray(d)) setSlots(d) }).catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const vacant = slots.filter(s => s.status === 'vacant').length
  const occupied = slots.filter(s => s.status === 'occupied').length
  const pct = ROTATE_SECONDS > 0 ? ((countdown / ROTATE_SECONDS) * 100) : 100
  // SVG ring
  const r = 22, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const urgency = countdown <= 5

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#06060e;font-family:'Prompt',sans-serif;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px}
        .bg1{position:fixed;top:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(124,77,255,.15),transparent 70%);pointer-events:none}
        .bg2{position:fixed;bottom:-60px;right:-60px;width:320px;height:320px;background:radial-gradient(circle,rgba(52,211,153,.1),transparent 70%);pointer-events:none}
        .container{display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;max-width:480px}
        .logo-row{display:flex;align-items:center;gap:14px}
        .logo-icon{width:56px;height:56px;background:linear-gradient(135deg,#7c4dff,#e040fb);border-radius:18px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;box-shadow:0 0 32px rgba(124,77,255,.5)}
        .logo-text{font-family:'Orbitron',sans-serif;font-size:28px;font-weight:900;background:linear-gradient(90deg,#a78bfa,#fff,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .time-badge{font-family:'Orbitron',sans-serif;font-size:13px;color:#555577;letter-spacing:2px}
        .card{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:28px;padding:28px 32px;display:flex;flex-direction:column;align-items:center;backdrop-filter:blur(12px)}
        .card-title{font-size:14px;color:#a78bfa;font-weight:600;letter-spacing:1px;margin-bottom:4px;text-transform:uppercase}
        .card-sub{font-size:12px;color:#333355;margin-bottom:20px}
        .qr-wrap{position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
        .qr-frame{
          background:#fff;border-radius:20px;padding:14px;
          box-shadow:0 0 40px rgba(124,77,255,.25),0 0 80px rgba(124,77,255,.1);
          transition:opacity .4s ease,transform .4s ease;
        }
        .qr-frame.fading{opacity:.15;transform:scale(.96)}
        .countdown-ring{position:absolute;top:-10px;right:-10px;background:#06060e;border-radius:50%;padding:2px}
        .cd-num{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
        .scan-hint{display:flex;align-items:center;gap:8px;font-size:13px;color:#8888aa}
        .scan-dot{width:8px;height:8px;border-radius:50%;background:#a78bfa;animation:blink 1.2s ease infinite}
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .refresh-hint{font-size:11px;color:#333355;margin-top:6px}
        .slots-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%}
        .slot-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;text-align:center}
        .slot-card.occ{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.05)}
        .slot-card.vac{border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.05)}
        .slot-name{font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700;margin-bottom:6px}
        .slot-dot{width:10px;height:10px;border-radius:50%;margin:0 auto}
        .occ .slot-dot{background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,.6)}
        .vac .slot-dot{background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.6)}
        .summary{display:flex;gap:20px}
        .sum-item{display:flex;align-items:center;gap:6px;font-size:13px}
        .sum-dot{width:8px;height:8px;border-radius:50%}
        .footer{font-size:10px;color:#1e1e33;text-align:center}
      `}</style>
      <div className="bg1" /><div className="bg2" />

      <div className="container">
        <div className="logo-row">
          <div className="logo-icon">P</div>
          <div>
            <div className="logo-text">SMART PARK</div>
            <div className="time-badge">{time || '00:00:00'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">สแกนเพื่อเข้าจอดรถ</div>
          <div className="card-sub">ใช้กล้องหรือ LINE สแกน QR Code</div>

          <div className="qr-wrap">
            <div className={`qr-frame${fading ? ' fading' : ''}`}>
              <div ref={qrRef} />
            </div>

            {/* Countdown ring */}
            <div className="countdown-ring">
              <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
                <circle
                  cx="26" cy="26" r={r} fill="none"
                  stroke={urgency ? '#ef4444' : '#a78bfa'}
                  strokeWidth="4"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray .9s linear, stroke .3s' }}
                />
              </svg>
              <div className="cd-num" style={{ color: urgency ? '#ef4444' : '#a78bfa' }}>
                {countdown}
              </div>
            </div>
          </div>

          <div className="scan-hint">
            <div className="scan-dot" />
            พร้อมสแกน — ระบบ CUEE SmartPark
          </div>
          <div className="refresh-hint">QR เปลี่ยนทุก {ROTATE_SECONDS} วินาที</div>
        </div>

        {slots.length > 0 && (
          <>
            <div className="slots-row">
              {slots.map(s => (
                <div key={s.slot_name} className={`slot-card ${s.status === 'occupied' ? 'occ' : 'vac'}`}>
                  <div className="slot-name">{s.slot_name}</div>
                  <div className="slot-dot" />
                </div>
              ))}
            </div>
            <div className="summary">
              <div className="sum-item">
                <div className="sum-dot" style={{ background: '#34d399' }} />
                <span style={{ color: '#34d399', fontWeight: 600 }}>{vacant}</span>
                <span style={{ color: '#555577' }}>ว่าง</span>
              </div>
              <div className="sum-item">
                <div className="sum-dot" style={{ background: '#ef4444' }} />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{occupied}</span>
                <span style={{ color: '#555577' }}>ไม่ว่าง</span>
              </div>
            </div>
          </>
        )}

        <div className="footer">ระบบที่จอดรถอัจฉริยะ · CUEE · Powered by Next.js + Vercel</div>
      </div>
    </>
  )
}
