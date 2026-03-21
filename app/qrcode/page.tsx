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
  const lastGen = useRef(-1)

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

  // Poll QR generation — rotate immediately on scan
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/qr-status')
        const { gen } = await r.json()
        if (lastGen.current === -1) { lastGen.current = gen; return }
        if (gen !== lastGen.current) {
          lastGen.current = gen
          const newTok = Date.now().toString(36) // unique token
          setFading(true)
          setTimeout(() => { generateQR(newTok); setFading(false) }, 400)
        }
      } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 2000)
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
        .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;margin-bottom:4px}
        .qr-frame{
          background:#fff;border-radius:20px;padding:14px;
          box-shadow:0 0 40px rgba(124,77,255,.25),0 0 80px rgba(124,77,255,.1);
          transition:opacity .4s ease,transform .4s ease;
        }
        .qr-frame.fading{opacity:.1;transform:scale(.94) blur(4px)}

        /* Countdown bar */
        .cd-bar-wrap{width:100%;display:flex;flex-direction:column;gap:8px}
        .cd-top{display:flex;align-items:center;justify-content:space-between}
        .cd-label{display:flex;align-items:center;gap:6px;font-size:12px;color:#555577}
        .cd-dot{width:7px;height:7px;border-radius:50%;background:#a78bfa;animation:cdpulse 1s ease infinite}
        @keyframes cdpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}
        .cd-num-pill{
          display:flex;align-items:center;gap:4px;
          background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);
          border-radius:20px;padding:3px 10px;
          font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;
          color:#a78bfa;
          transition:background .3s,border-color .3s,color .3s;
        }
        .cd-num-pill.urgent{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.3);color:#ef4444;animation:shake .4s ease}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
        .cd-track{width:100%;height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}
        .cd-fill{
          height:100%;border-radius:99px;
          background:linear-gradient(90deg,#7c4dff,#a78bfa);
          transition:width 1s linear,background .3s;
          box-shadow:0 0 8px rgba(167,139,250,.4);
        }
        .cd-fill.urgent{background:linear-gradient(90deg,#dc2626,#ef4444);box-shadow:0 0 8px rgba(239,68,68,.5)}

        .scan-hint{display:flex;align-items:center;gap:8px;font-size:13px;color:#8888aa}
        .scan-dot{width:8px;height:8px;border-radius:50%;background:#a78bfa;animation:cdpulse 1.2s ease infinite}
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

            {/* Countdown bar */}
            <div className="cd-bar-wrap">
              <div className="cd-top">
                <div className="cd-label">
                  <div className="cd-dot" />
                  QR เปลี่ยนอัตโนมัติทุก {ROTATE_SECONDS}s
                </div>
                <div className={`cd-num-pill${urgency ? ' urgent' : ''}`}>
                  {urgency ? '🔄' : '⏱'} {countdown}s
                </div>
              </div>
              <div className="cd-track">
                <div
                  className={`cd-fill${urgency ? ' urgent' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="scan-hint">
            <div className="scan-dot" />
            พร้อมสแกน — ระบบ CUEE SmartPark
          </div>
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
