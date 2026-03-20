<?php

require dirname(__DIR__) . '/app/bootstrap.php';
require_session();

try {
    $data = json_input();
    $action = trim((string) ($data['action'] ?? ''));
    $slot = trim((string) ($data['slot'] ?? ''));
    $duration = (int) ($data['duration'] ?? env_int('DEFAULT_PARKING_DURATION_MINUTES', 35));
    $warn = (int) ($data['warn'] ?? env_int('DEFAULT_WARNING_MINUTES', 20));
    $lineUserId = trim((string) ($_SESSION['line_user_id'] ?? ''));

    if ($slot === '') {
        json_response(['success' => false, 'message' => 'Slot is required.'], 422);
    }

    $repository = new ParkingRepository(new MongoStore());

    if ($action === 'start') {
        $repository->endActiveSessions($slot);
        $repository->createSession($slot, $lineUserId, $duration, $warn, 'manual');
        json_response([
            'success' => true,
            'action' => 'started',
            'slot' => $slot,
            'line_linked' => $lineUserId !== '',
        ]);
    }

    if ($action === 'end') {
        $repository->endActiveSessions($slot);
        json_response([
            'success' => true,
            'action' => 'ended',
            'slot' => $slot,
        ]);
    }

    json_response(['success' => false, 'message' => 'Unknown action.'], 422);
} catch (Throwable $exception) {
    json_response([
        'success' => false,
        'message' => $exception->getMessage(),
    ], 500);
}
