<?php

require __DIR__ . '/app/bootstrap.php';
require_session();

$defaultUsername = env('ADMIN_USERNAME', 'admin') ?? 'admin';
$defaultPassword = env('ADMIN_PASSWORD', 'admin1234') ?? 'admin1234';
$requestIp = client_ip();

if (isset($_GET['logout'])) {
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }

    session_destroy();
    redirect_to(app_url('admin.php'));
}

$isAuthenticated = (bool) ($_SESSION['is_admin_authenticated'] ?? false);
$error = '';

if (!$isAuthenticated && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (too_many_login_attempts($requestIp)) {
        $error = 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที';
    } else {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        $validUser = hash_equals($defaultUsername, $username);
        $validPassword = hash_equals($defaultPassword, $password);

        if ($validUser && $validPassword) {
            session_regenerate_id(true);
            $_SESSION['is_admin_authenticated'] = true;
            $_SESSION['admin_username'] = $username;
            clear_login_attempts($requestIp);
            redirect_to(app_url('admin.php'));
        }

        record_login_attempt($requestIp);
        $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    }
}

if (!$isAuthenticated) {
    $safeError = htmlspecialchars($error, ENT_QUOTES, 'UTF-8');
    ?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartPark Admin Login</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #050816;
      --panel: rgba(12, 18, 32, 0.9);
      --panel-border: rgba(255,255,255,0.08);
      --primary: #58a6ff;
      --danger: #f85149;
      --text: #e6edf3;
      --muted: #8b949e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: var(--text);
      font-family: 'Prompt', sans-serif;
      background:
        radial-gradient(circle at top left, rgba(88,166,255,0.2), transparent 30%),
        radial-gradient(circle at bottom right, rgba(188,140,255,0.15), transparent 28%),
        linear-gradient(180deg, #050816 0%, #0b1020 100%);
    }
    .card {
      width: 100%;
      max-width: 420px;
      padding: 32px 28px;
      border-radius: 24px;
      background: var(--panel);
      border: 1px solid var(--panel-border);
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    }
    .logo {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      margin-bottom: 18px;
      background: linear-gradient(135deg, #58a6ff, #bc8cff);
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }
    h1 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .sub {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 24px;
    }
    .error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(248,81,73,0.12);
      border: 1px solid rgba(248,81,73,0.28);
      color: #ffb3ad;
      font-size: 14px;
    }
    label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
      letter-spacing: .04em;
    }
    .field { margin-bottom: 18px; }
    input {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: var(--text);
      border-radius: 14px;
      padding: 14px 16px;
      font-size: 15px;
      outline: none;
    }
    input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(88,166,255,0.18);
    }
    button {
      width: 100%;
      border: none;
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      background: linear-gradient(135deg, #1f6feb, #58a6ff);
    }
    .hint {
      margin-top: 14px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <form class="card" method="post" action="admin.php">
    <div class="logo">SP</div>
    <h1>ADMIN LOGIN</h1>
    <p class="sub">กรอกบัญชีแอดมินก่อนเข้าหน้า dashboard</p>
    <?php if ($safeError !== ''): ?>
      <div class="error"><?php echo $safeError; ?></div>
    <?php endif; ?>
    <div class="field">
      <label for="username">USERNAME</label>
      <input id="username" name="username" type="text" autocomplete="username" required>
    </div>
    <div class="field">
      <label for="password">PASSWORD</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
    </div>
    <button type="submit">LOGIN</button>
    <p class="hint">ตั้งค่าได้ที่ไฟล์ .env ด้วย `ADMIN_USERNAME` และ `ADMIN_PASSWORD`</p>
  </form>
</body>
</html>
    <?php
    exit;
}

define('SMARTPARK_ADMIN_VIEW', true);
require __DIR__ . '/app/views/admin_dashboard.php';
