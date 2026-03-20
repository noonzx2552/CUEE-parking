<?php

require dirname(__DIR__) . '/app/bootstrap.php';

try {
    require_method('POST');

    $rawBody = request_body_raw();
    $data = json_input();
    $slot = trim((string) ($data['slot'] ?? ''));
    $status = trim((string) ($data['status'] ?? ''));
    $source = trim((string) ($data['source'] ?? 'auto'));

    if ($source === 'sensor' && !validate_signed_device_request($rawBody)) {
        json_response(['error' => 'Unauthorized device request.'], 401);
    }

    if ($slot === '' || !in_array($status, ['vacant', 'occupied'], true)) {
        json_response(['error' => 'Invalid slot or status.'], 422);
    }

    $repository = new ParkingRepository(new MongoStore());
    $current = $repository->getSlot($slot);
    $currentStatus = (string) ($current['status'] ?? '');

    $repository->setSlotStatus($slot, $status, $source);

    if ($status !== $currentStatus) {
        if ($status === 'occupied') {
            $repository->endActiveSessions($slot);
            $repository->createSession($slot, '', null, null, $source);
        } else {
            $repository->endActiveSessions($slot);
        }
    }

    json_response([
        'success' => true,
        'slot' => $slot,
        'status' => $status,
        'changed' => $status !== $currentStatus,
    ]);
} catch (Throwable $exception) {
    json_response(['error' => $exception->getMessage()], 500);
}
