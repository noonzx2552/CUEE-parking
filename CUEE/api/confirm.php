<?php

require dirname(__DIR__) . '/app/bootstrap.php';
require_session();

try {
    $repository = new ParkingRepository(new MongoStore());
    $lineClient = new LineClient();
    $data = json_input();

    $slot = trim((string) ($data['slot'] ?? ''));
    $lineUserId = trim((string) ($data['user_id'] ?? ''));
    $entranceTime = trim((string) ($data['entrance_time'] ?? date('H:i')));

    if ($slot === '') {
        json_response(['status' => 'error', 'message' => 'Slot is required.'], 422);
    }

    $linked = false;
    if ($lineUserId !== '') {
        $linked = $repository->attachLineUserToActiveSession($slot, $lineUserId);
        if ($lineClient->isConfigured()) {
            $lineClient->pushParkingTicket($lineUserId, $slot, $entranceTime);
        }
    }

    json_response([
        'status' => 'success',
        'slot' => $slot,
        'line_linked' => $linked,
    ]);
} catch (Throwable $exception) {
    json_response([
        'status' => 'error',
        'message' => $exception->getMessage(),
    ], 500);
}
