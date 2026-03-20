<?php

if (defined('SMARTPARK_BOOTSTRAPPED')) {
    return;
}

define('SMARTPARK_BOOTSTRAPPED', true);
define('SMARTPARK_APP_ROOT', __DIR__);
define('SMARTPARK_PUBLIC_ROOT', dirname(__DIR__));

require SMARTPARK_APP_ROOT . '/config/env.php';

load_env(SMARTPARK_PUBLIC_ROOT . '/.env');

date_default_timezone_set(env('APP_TIMEZONE', 'Asia/Bangkok') ?? 'Asia/Bangkok');

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

require SMARTPARK_APP_ROOT . '/lib/helpers.php';
require SMARTPARK_APP_ROOT . '/lib/MongoStore.php';
require SMARTPARK_APP_ROOT . '/lib/ParkingRepository.php';
require SMARTPARK_APP_ROOT . '/lib/LineClient.php';

apply_security_headers();
