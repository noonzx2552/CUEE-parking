<?php

function now_iso8601(): string
{
    return date(DATE_ATOM);
}

function apply_security_headers(): void
{
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header("Content-Security-Policy: default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'; base-uri 'self';");

    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function app_base_url(): string
{
    $configured = rtrim((string) env('APP_BASE_URL', ''), '/');
    if ($configured !== '') {
        return $configured;
    }

    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $httpsEnabled = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $httpsEnabled ? 'https' : 'http';

    $documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '';
    $publicRoot = realpath(SMARTPARK_PUBLIC_ROOT) ?: '';

    if ($documentRoot !== '' && $publicRoot !== '' && str_starts_with($publicRoot, $documentRoot)) {
        $relative = trim(str_replace('\\', '/', substr($publicRoot, strlen($documentRoot))), '/');
        return $scheme . '://' . $host . ($relative !== '' ? '/' . $relative : '');
    }

    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $dir = trim(dirname($scriptName), '/.');

    if (str_ends_with($dir, '/api')) {
        $dir = substr($dir, 0, -4);
    } elseif (str_ends_with($dir, '/auth')) {
        $dir = substr($dir, 0, -5);
    }

    return $scheme . '://' . $host . ($dir !== '' ? '/' . trim($dir, '/') : '');
}

function app_url(string $path = ''): string
{
    $base = app_base_url();
    $path = ltrim($path, '/');
    return $path === '' ? $base : $base . '/' . $path;
}

function redirect_to(string $location): void
{
    header('Location: ' . $location);
    exit;
}

function require_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function require_method(string $method): void
{
    $current = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($current !== strtoupper($method)) {
        json_response(['error' => 'Method not allowed.'], 405);
    }
}

function request_header(string $name): ?string
{
    $normalized = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $value = $_SERVER[$normalized] ?? null;

    if ($value === null || $value === '') {
        return null;
    }

    return trim((string) $value);
}

function is_admin_authenticated(): bool
{
    require_session();
    return (bool) ($_SESSION['is_admin_authenticated'] ?? false);
}

function validate_api_key(?string $providedKey, string $envKeyName = 'DEVICE_API_KEY'): bool
{
    $expectedKey = env($envKeyName, '') ?? '';

    if ($expectedKey === '' || $providedKey === null || $providedKey === '') {
        return false;
    }

    return hash_equals($expectedKey, $providedKey);
}

function client_ip(): string
{
    return trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
}

function request_body_raw(): string
{
    static $rawBody;

    if ($rawBody !== null) {
        return $rawBody;
    }

    $raw = file_get_contents('php://input');
    $rawBody = ($raw === false) ? '' : $raw;
    return $rawBody;
}

function json_input(): array
{
    $raw = request_body_raw();
    if (trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function validate_signed_device_request(string $rawBody): bool
{
    $apiKey = request_header('X-API-Key') ?? '';
    $timestamp = request_header('X-Timestamp') ?? '';
    $signature = request_header('X-Signature') ?? '';

    if (!validate_api_key($apiKey) || $timestamp === '' || $signature === '') {
        return false;
    }

    if (!ctype_digit($timestamp)) {
        return false;
    }

    $now = time();
    $requestTime = (int) $timestamp;
    $window = env_int('DEVICE_HMAC_WINDOW_SECONDS', 300);
    if (abs($now - $requestTime) > $window) {
        return false;
    }

    $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $apiKey);
    return hash_equals($expected, $signature);
}

function security_storage_path(string $filename): string
{
    $dir = SMARTPARK_APP_ROOT . '/storage/security';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    return $dir . '/' . $filename;
}

function too_many_login_attempts(string $ip, int $maxAttempts = 5, int $windowSeconds = 900): bool
{
    $file = security_storage_path('login_' . sha1($ip) . '.json');
    $attempts = [];

    if (is_file($file)) {
        $data = json_decode((string) file_get_contents($file), true);
        $attempts = is_array($data) ? $data : [];
    }

    $cutoff = time() - $windowSeconds;
    $attempts = array_values(array_filter($attempts, static fn($ts): bool => is_int($ts) && $ts >= $cutoff));

    file_put_contents($file, json_encode($attempts));
    return count($attempts) >= $maxAttempts;
}

function record_login_attempt(string $ip): void
{
    $file = security_storage_path('login_' . sha1($ip) . '.json');
    $attempts = [];

    if (is_file($file)) {
        $data = json_decode((string) file_get_contents($file), true);
        $attempts = is_array($data) ? $data : [];
    }

    $attempts[] = time();
    file_put_contents($file, json_encode($attempts));
}

function clear_login_attempts(string $ip): void
{
    $file = security_storage_path('login_' . sha1($ip) . '.json');
    if (is_file($file)) {
        unlink($file);
    }
}
