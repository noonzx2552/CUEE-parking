<!DOCTYPE html>
<html lang="th">
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartPark — ขาออก</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#06060e;font-family:'Inter',sans-serif;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
    .bg1{position:fixed;top:-80px;left:-80px;width:320px;height:320px;background:radial-gradient(circle,rgba(124,77,255,.15),transparent 70%);pointer-events:none}
    .bg2{position:fixed;bottom:0;right:-60px;width:260px;height:260px;background:radial-gradient(circle,rgba(52,211,153,.08),transparent 70%);pointer-events:none}

    .card{width:100%;max-width:340px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:28px 20px;position:relative;z-index:2;text-align:center}

    .logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px}
    .logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#7c4dff,#e040fb);border-radius:11px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:900;box-shadow:0 0 18px rgba(124,77,255,.45)}
    .logo-title{font-family:'Orbitron',sans-serif;font-size:19px;font-weight:900;background:linear-gradient(90deg,#a78bfa,#fff,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .sub{font-size:11px;color:#444466;margin-bottom:20px}

    /* ===== SLOT BADGE ===== */
    .slot-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:20px;padding:5px 14px;margin-bottom:16px;font-size:12px;color:#34d399;font-weight:700}

    /* ===== TIMER ===== */
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

    /* ===== QR ===== */
    .qr-label{font-size:11px;color:#ffcc00;font-weight:700;margin-bottom:10px;letter-spacing:.5px}
    .qr-wrap{background:#fff;border-radius:16px;padding:16px;display:inline-block;margin-bottom:12px;box-shadow:0 0 30px rgba(124,77,255,.2)}
    .qr-wrap img{display:block;width:190px;height:190px}
    .qr-hint{font-size:10px;color:#333355;line-height:1.7}

    /* ===== CHECKIN TIME ===== */
    .checkin-info{margin-top:16px;padding:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px}
    .ci-row{display:flex;justify-content:space-between;font-size:11px;padding:4px 0}
    .ci-key{color:#444466}
    .ci-val{font-weight:700;color:#a78bfa}
  </style>
</head>
<body>
  <div class="bg1"></div><div class="bg2"></div>

  <div class="card">
    <div class="logo-row">
      <div class="logo-icon">P</div>
      <div class="logo-title">SmartPark</div>
    </div>
    <div class="sub">ระบบที่จอดรถอัจฉริยะ — ชั้น B1</div>

    <div class="slot-badge">🅿️ ช่อง <span id="slot-display">--</span> &nbsp;·&nbsp; ชั้น B1</div>

    <!-- Timer -->
    <div class="timer-card">
      <div class="timer-title">⏱ เวลาที่จอดมาแล้ว</div>
      <div class="timer-row">
        <div class="timer-item">
          <div class="timer-num" id="t-h">00</div>
          <div class="timer-lbl">ชม.</div>
        </div>
        <div class="timer-sep">:</div>
        <div class="timer-item">
          <div class="timer-num" id="t-m">00</div>
          <div class="timer-lbl">นาที</div>
        </div>
        <div class="timer-sep">:</div>
        <div class="timer-item">
          <div class="timer-num" id="t-s">00</div>
          <div class="timer-lbl">วินาที</div>
        </div>
      </div>
    </div>

    <!-- QR Code -->
    <div class="qr-label">📲 แสดง QR Code นี้ที่ทางออก</div>
    <div class="qr-wrap">
      <div id="qr-container" style="display: flex; justify-content: center; background: #fff; padding: 15px; border-radius: 12px; margin: 20px auto; width: max-content;"></div>
    </div>
    <div class="qr-hint">นำ QR Code นี้ไปสแกนที่เครื่องขาออก<br>ไม้กั้นจะเปิดอัตโนมัติ</div>

    <!-- เวลาเข้า/ออก -->
    <div class="checkin-info">
      <div class="ci-row">
        <span class="ci-key">🕐 เวลาเข้า</span>
        <span class="ci-val" id="ci-in">--:--:--</span>
      </div>
      <div class="ci-row">
        <span class="ci-key">🕐 เวลาปัจจุบัน</span>
        <span class="ci-val" id="ci-now">--:--:--</span>
      </div>
    </div>
  </div>

  <script>
    // ===== ดึงข้อมูลจาก localStorage (บันทึกตอน checkin) =====
    // ในระบบจริงดึงจาก session PHP
    // สำหรับทดสอบ: จำลองเข้ามา 25 นาทีที่แล้ว
    const slot    = localStorage.getItem('sp_slot')    || 'A1';
    const checkin = localStorage.getItem('sp_checkin') 
                    ? new Date(parseInt(localStorage.getItem('sp_checkin')))
                    : new Date(Date.now() - 25 * 60 * 1000);

    document.getElementById('slot-display').textContent = slot;
    document.getElementById('ci-in').textContent = checkin.toLocaleTimeString('th-TH');

    // ===== สร้าง QR Code =====
// ===== สร้าง QR Code (ออฟไลน์ 100%) =====
const qrData = `SMARTPARK-OUT:${slot}:${checkin.getTime()}`;

// หา Element ที่จะวาง QR Code และเคลียร์ของเก่าทิ้ง (ถ้ามี)
const qrContainer = document.getElementById('qr-container');
qrContainer.innerHTML = '';

// สร้าง QR Code ใหม่ด้วยไลบรารี qrcode.js
new QRCode(qrContainer, {
    text: qrData,
    width: 190,
    height: 190,
    colorDark : "#000000",   // สีของคิวอาร์โค้ด
    colorLight : "#ffffff",  // สีพื้นหลัง
    correctLevel : QRCode.CorrectLevel.H // ระดับความทนทานต่อรอยขีดข่วน (High)
});

    // ===== นับเวลา =====
    function updateTimer() {
      const now  = new Date();
      const diff = Math.floor((now - checkin) / 1000);
      const h    = Math.floor(diff / 3600);
      const m    = Math.floor((diff % 3600) / 60);
      const s    = diff % 60;

      const th = document.getElementById('t-h');
      const tm = document.getElementById('t-m');
      const ts = document.getElementById('t-s');

      th.textContent = String(h).padStart(2, '0');
      tm.textContent = String(m).padStart(2, '0');
      ts.textContent = String(s).padStart(2, '0');

      // สีเตือน
      if (diff >= 3600) {
        th.className = tm.className = ts.className = 'timer-num over';
      } else if (diff >= 3000) {
        tm.className = ts.className = 'timer-num warn';
      } else {
        th.className = tm.className = ts.className = 'timer-num';
      }

      document.getElementById('ci-now').textContent = now.toLocaleTimeString('th-TH');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  </script>
</body>
</html>