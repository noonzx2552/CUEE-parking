<?php

require dirname(__DIR__) . '/app/bootstrap.php';

function format_remaining_text(int $seconds): string
{
    if ($seconds <= 0) {
        return '0 วินาที';
    }

    $minutes = intdiv($seconds, 60);
    $remainSeconds = $seconds % 60;

    if ($minutes > 0 && $remainSeconds > 0) {
        return $minutes . ' นาที ' . $remainSeconds . ' วินาที';
    }

    if ($minutes > 0) {
        return $minutes . ' นาที';
    }

    return $remainSeconds . ' วินาที';
}

try {
    $data = json_input();
    $userId = trim((string) ($data['user_id'] ?? ''));
    $slot = trim((string) ($data['slot'] ?? 'ไม่ระบุช่อง'));
    $type = trim((string) ($data['type'] ?? 'warn'));
    $remaining = (int) ($data['remaining'] ?? 0);

    if ($userId === '') {
        json_response(['status' => 'error', 'message' => 'User ID is required.'], 422);
    }

    if ($type === 'billing') {
        $fee = (int) ($data['fee'] ?? 0);
        $period = (int) ($data['period'] ?? 1);
        $message = "💳 ช่อง {$slot}\nค่าจอดสะสม {$fee} บาท\nเกินเวลามาแล้ว " . ($period * 15) . ' วินาที';
    } elseif ($type === 'expired') {
        $message = "🚨 ช่อง {$slot}\nเวลาจอดหมดแล้ว กรุณานำรถออกทันที";
    } else {
        $message = "⚠️ ช่อง {$slot}\nเหลือเวลาจอดอีก " . format_remaining_text($remaining);
    }

    $lineClient = new LineClient();
    $lineClient->pushMessage($userId, [['type' => 'text', 'text' => $message]]);

    json_response(['status' => 'success']);
} catch (Throwable $exception) {
    json_response([
        'status' => 'error',
        'message' => $exception->getMessage(),
    ], 500);
}
