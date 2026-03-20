<?php

require dirname(__DIR__) . '/app/bootstrap.php';

try {
    $lineClient = new LineClient();
    $repository = new ParkingRepository(new MongoStore());
    $data = json_input();

    if (empty($data['events']) || !$lineClient->isConfigured()) {
        json_response(['status' => 'ok']);
    }

    foreach ($data['events'] as $event) {
        if (($event['type'] ?? '') !== 'message' || ($event['message']['type'] ?? '') !== 'text') {
            continue;
        }

        $replyToken = (string) ($event['replyToken'] ?? '');
        $userMessage = trim((string) ($event['message']['text'] ?? ''));
        if ($replyToken === '' || $userMessage === '') {
            continue;
        }

        $slots = $repository->getSlots();
        $vacant = 0;
        $occupied = 0;

        foreach ($slots as $slot) {
            if (($slot['status'] ?? '') === 'vacant') {
                $vacant++;
            } else {
                $occupied++;
            }
        }

        $lower = mb_strtolower($userMessage, 'UTF-8');

        if (str_contains($lower, 'สถานะ') || str_contains($lower, 'ว่าง') || str_contains($lower, 'status') || $lower === '?') {
            $lines = [
                'SmartPark Status',
                'อัปเดตล่าสุด ' . date('H:i') . ' น.',
                '',
            ];

            foreach ($slots as $slot) {
                $isVacant = ($slot['status'] ?? '') === 'vacant';
                $lines[] = ($isVacant ? '🟢 ' : '🔴 ') . ($slot['slot_name'] ?? '-') . ' - ' . ($isVacant ? 'ว่าง' : 'ไม่ว่าง');
            }

            $lines[] = '';
            $lines[] = "ว่าง {$vacant} ช่อง | ไม่ว่าง {$occupied} ช่อง";
            $replyText = implode("\n", $lines);
        } elseif (str_contains($lower, 'ราคา') || str_contains($lower, 'ค่าจอด') || str_contains($lower, 'เงิน')) {
            $replyText = "ค่าจอด SmartPark\n30 วินาทีแรก 20 บาท\nหลังจากนั้น +20 บาท ทุก 15 วินาที";
        } elseif (str_contains($lower, 'วิธีใช้') || str_contains($lower, 'help') || str_contains($lower, 'ช่วย')) {
            $replyText = "วิธีใช้ SmartPark\n1. สแกน QR ทางเข้า\n2. เพิ่ม LINE และเลือกช่องจอด\n3. รับแจ้งเตือนผ่าน LINE\n4. แสดง QR ตอนออก";
        } else {
            $replyText = "SmartPark Bot\nตอนนี้มีช่องว่าง {$vacant} ช่อง\nพิมพ์ 'สถานะ' เพื่อดูทุกช่อง";
        }

        $lineClient->replyText($replyToken, $replyText);
    }

    json_response(['status' => 'ok']);
} catch (Throwable $exception) {
    json_response(['status' => 'error', 'message' => $exception->getMessage()], 500);
}
