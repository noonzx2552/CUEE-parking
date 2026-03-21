'use client'
import { useEffect, useRef, useState } from 'react'

export default function CheckoutPage() {
  const qrRef = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState('--')
  const [checkinTime, setCheckinTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [checkinDisplay, setCheckinDisplay] = useState('--:--:--')

  useEffect(() => {
    const s = localStorage.getItem('sp_slot') || 'A1'
    const ts = localStorage.getItem('sp_entrance_time')
    const ci = ts ? new Date(parseInt(ts)) : new Date(Date.now() - 25 * 60 * 1000)
    setSlot(s)
    setCheckinTime(ci)
    setCheckinDisplay(ci.toLocaleTimeString('th-TH'))

    const qrData = `SMARTPARK-OUT:${s}:${ci.getTime()}`
    if (qrRef.current) {
      qrRef.current.innerHTML = ''
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      script.onload = () => {
          if (qrRef.current) {
            new (window as any).QRCode(qrRef.current, { text: qrData, width: 190, height: 190, colorDark: '#000000', colorLight: '#ffffff', correctLevel: 1 })
          }
      }
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (!checkinTime) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - checkinTime.getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [checkinTime])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const cls = elapsed >= 3600 ? 'timer-num over' : elapsed >= 3000 ? 'timer-num warn' : 'timer-num'

  return (
    <>
      <style>{`
        body{background:#06060e;font-family:'Prompt',sans-serif;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        .bg1{position:fixed;top:-80px;left:-80px;width:320px;height:320px;background:radial-gradient(circle,rgba(124,77,255,.15),transparent 70%);pointer-events:none}
        .bg2{position:fixed;bottom:0;right:-60px;width:260px;height:260px;background:radial-gradient(circle,rgba(52,211,153,.08),transparent 70%);pointer-events:none}
        .card{width:100%;max-width:340px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:28px 20px;position:relative;z-index:2;text-align:center}
        .logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px}
        .logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#7c4dff,#e040fb);border-radius:11px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:900}
        .logo-title{font-family:'Orbitron',sans-serif;font-size:19px;font-weight:900;background:linear-gradient(90deg,#a78bfa,#fff,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sub{font-size:11px;color:#444466;margin-bottom:20px}
        .slot-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:20px;padding:5px 14px;margin-bottom:16px;font-size:12px;color:#34d399;font-weight:700}
        .timer-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;margin-bottom:20px}
        .timer-title{font-size:10px;color:#444466;letter-spacing:.5px;margin-bottom:10px;font-weight:600}
        .timer-row{display:flex;align-items:center;justify-content:center;gap:4px}
        .timer-item{text-align:center;min-width:56px}
        .timer-num{font-family:'Orbitron',sans-serif;font-size:32px;font-weight:900;line-height:1;color:#a78bfa}
        .timer-num.warn{color:#ffcc00;animation:blink .8s infinite}
        .timer-num.over{color:#ff4c6a;animation:blink .5s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        .timer-lbl{font-size:9px;color:#333355;margin-top:4px;letter-spacing:.5px}
        .timer-sep{font-family:'Orbitron',sans-serif;font-size:28px;color:#333355;padding-bottom:12px}
        .qr-label{font-size:11px;color:#ffcc00;font-weight:700;margin-bottom:10px;letter-spacing:.5px}
        .qr-wrap{background:#fff;border-radius:16px;padding:16px;display:inline-block;margin-bottom:12px}
        .qr-hint{font-size:10px;color:#333355;line-height:1.7}
        .checkin-info{margin-top:16px;padding:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px}
        .ci-row{display:flex;justify-content:space-between;font-size:11px;padding:4px 0}
        .ci-key{color:#444466}
        .ci-val{font-weight:700;color:#a78bfa}
      `}</style>
      <div className="bg1" /><div className="bg2" />
      <div className="card">
        <div className="logo-row">
          <div className="logo-icon">P</div>
          <div className="logo-title">SmartPark</div>
        </div>
        <div className="sub">ระบบที่จอดรถอัจฉริยะ — ชั้น B1</div>
        <div className="slot-badge">🅿️ ช่อง {slot} &nbsp;·&nbsp; ชั้น B1</div>
        <div className="timer-card">
          <div className="timer-title">⏱ เวลาที่จอดมาแล้ว</div>
          <div className="timer-row">
            <div className="timer-item"><div className={cls}>{pad(h)}</div><div className="timer-lbl">ชม.</div></div>
            <div className="timer-sep">:</div>
            <div className="timer-item"><div className={cls}>{pad(m)}</div><div className="timer-lbl">นาที</div></div>
            <div className="timer-sep">:</div>
            <div className="timer-item"><div className={cls}>{pad(s)}</div><div className="timer-lbl">วินาที</div></div>
          </div>
        </div>
        <div className="qr-label">📲 แสดง QR Code นี้ที่ทางออก</div>
        <div className="qr-wrap">
          <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 12 }} />
        </div>
        <div className="qr-hint">นำ QR Code นี้ไปสแกนที่เครื่องขาออก<br />ไม้กั้นจะเปิดอัตโนมัติ</div>
        <div className="checkin-info">
          <div className="ci-row"><span className="ci-key">🕐 เวลาเข้า</span><span className="ci-val">{checkinDisplay}</span></div>
          <div className="ci-row"><span className="ci-key">🕐 เวลาปัจจุบัน</span><span className="ci-val">{new Date().toLocaleTimeString('th-TH')}</span></div>
        </div>
      </div>
    </>
  )
}
