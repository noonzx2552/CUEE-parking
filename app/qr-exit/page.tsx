'use client'
import { useEffect, useRef } from 'react'

export default function QrExitPage() {
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const qrData = window.location.origin + '/checkout'
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      if (qrRef.current) {
        qrRef.current.innerHTML = ''
        new window.QRCode(qrRef.current, { text: qrData, width: 240, height: 240, colorDark: '#000000', colorLight: '#ffffff', correctLevel: 1 })
      }
    }
    document.head.appendChild(script)
  }, [])

  return (
    <>
      <style>{`
        body{background:#06060e;font-family:'Prompt',sans-serif;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
        .card{width:100%;max-width:340px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:32px 24px;text-align:center}
        .logo{font-family:'Orbitron',sans-serif;font-size:24px;font-weight:900;background:linear-gradient(90deg,#f87171,#fff,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
        .sub{font-size:13px;color:#64748b;margin-bottom:24px}
        .qr-box{background:#fff;border-radius:16px;padding:20px;display:inline-block;margin-bottom:20px}
        .hint{font-size:13px;color:#fb923c;font-weight:600}
        .hint2{font-size:11px;color:#475569;margin-top:6px}
      `}</style>
      <div className="card">
        <div className="logo">SMART PARK</div>
        <div className="sub">สแกน QR เพื่อออกจากที่จอดรถ</div>
        <div className="qr-box">
          <div ref={qrRef} />
        </div>
        <div className="hint">📱 สแกนเพื่อชำระค่าจอดรถ</div>
        <div className="hint2">ระบบที่จอดรถอัจฉริยะ CUEE</div>
      </div>
    </>
  )
}
