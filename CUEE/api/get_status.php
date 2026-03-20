<?php

require dirname(__DIR__) . '/app/bootstrap.php';

header('Access-Control-Allow-Origin: *');

try {
    $repository = new ParkingRepository(new MongoStore());
    json_response($repository->getSlots());
} catch (Throwable $exception) {
    json_response(['error' => $exception->getMessage()], 500);
}
