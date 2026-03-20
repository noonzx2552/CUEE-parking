<?php

require __DIR__ . '/app/bootstrap.php';

header('Content-Type: application/javascript; charset=UTF-8');

$config = [
    'API_BASE' => 'api',
    'AUTH_BASE' => 'auth',
    'LINE_LIFF_ID' => env('LINE_LIFF_ID', ''),
];

echo 'window.APP_CONFIG = ' . json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';';
