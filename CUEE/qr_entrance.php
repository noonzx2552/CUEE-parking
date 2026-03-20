<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartPark - ป้อมทางเข้า</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    body { background: #0f172a; font-family: 'Prompt', sans-serif; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .container { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px 30px; text-align: center; width: 90%; max-width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .title { font-family: 'Orbitron', sans-serif; font-size: 28px; color: #6366f1; margin-bottom: 5px; font-weight: 900;}
    .subtitle { font-size: 15px; color: #94a3b8; margin-bottom: 25px; }
    .qr-box { background: #fff; padding: 20px; border-radius: 16px; display: inline-block; margin-bottom: 20px; }
    .instruction { font-size: 14px; color: #10b981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">SMART PARK</div>
    <div class="subtitle">🚗 จุดสแกนทางเข้า (Entrance)</div>
    <div class="qr-box" id="qr-code"></div>
    <div class="instruction">📲 ใช้กล้องมือถือสแกนเพื่อเปิดไม้กั้น</div>
  </div>

  <script>
    // ดึงลิงก์ปัจจุบันแล้วเปลี่ยนให้ชี้ไปที่ checkin.php อัตโนมัติ
    let currentUrl = window.location.href;
    let targetUrl = currentUrl.replace('qr_entrance.php', 'checkin.php');
    if (!targetUrl.includes('checkin.php')) {
        let baseUrl = window.location.origin + window.location.pathname;
        if (!baseUrl.endsWith('/')) baseUrl += '/';
        targetUrl = baseUrl + 'checkin.php';
    }

    new QRCode(document.getElementById("qr-code"), {
        text: targetUrl,
        width: 220,
        height: 220,
        colorDark : "#0f172a", 
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
  </script>
</body>
</html>