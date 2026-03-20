<?php

require dirname(__DIR__) . '/app/bootstrap.php';
require_session();

$clientId = env('LINE_LOGIN_CLIENT_ID', '') ?? '';
$clientSecret = env('LINE_LOGIN_CLIENT_SECRET', '') ?? '';
$redirectUri = env('LINE_REDIRECT_URI', app_url('line_link.php')) ?? app_url('line_link.php');

$code = trim((string) ($_GET['code'] ?? ''));
$error = trim((string) ($_GET['error'] ?? ''));

if ($error !== '' || $code === '') {
    redirect_to(app_url('index.html?line=cancel'));
}

if ($clientId === '' || $clientSecret === '') {
    redirect_to(app_url('index.html?line=error'));
}

$tokenRequest = curl_init('https://api.line.me/oauth2/v2.1/token');
curl_setopt_array($tokenRequest, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_POSTFIELDS => http_build_query([
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => $redirectUri,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
    ]),
]);
$tokenResponse = json_decode((string) curl_exec($tokenRequest), true);
curl_close($tokenRequest);

$accessToken = (string) ($tokenResponse['access_token'] ?? '');
if ($accessToken === '') {
    redirect_to(app_url('index.html?line=error'));
}

$profileRequest = curl_init('https://api.line.me/v2/profile');
curl_setopt_array($profileRequest, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
]);
$profile = json_decode((string) curl_exec($profileRequest), true);
curl_close($profileRequest);

$userId = (string) ($profile['userId'] ?? '');
$displayName = (string) ($profile['displayName'] ?? '');

if ($userId === '') {
    redirect_to(app_url('index.html?line=error'));
}

$_SESSION['line_user_id'] = $userId;
$_SESSION['line_name'] = $displayName;

try {
    $repository = new ParkingRepository(new MongoStore());
    $repository->upsertLineUser($userId, $displayName);
} catch (Throwable $exception) {
}

redirect_to(app_url('index.html?line=ok&name=' . urlencode($displayName)));
