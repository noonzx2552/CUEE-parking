<?php

function load_env(string $path): void
{
    static $loaded = [];

    if (isset($loaded[$path]) || !is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        [$name, $value] = array_pad(explode('=', $line, 2), 2, '');
        $name = trim($name);
        $value = trim($value);

        if ($name === '') {
            continue;
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        $value = preg_replace('/\s+#.*$/', '', $value) ?? $value;

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }

    $loaded[$path] = true;
}

function env(string $key, ?string $default = null): ?string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    return (string) $value;
}

function env_int(string $key, int $default): int
{
    $value = env($key);

    if ($value === null || !is_numeric($value)) {
        return $default;
    }

    return (int) $value;
}

function env_csv(string $key, array $default = []): array
{
    $value = env($key);

    if ($value === null) {
        return $default;
    }

    $items = array_filter(array_map('trim', explode(',', $value)));
    return array_values($items);
}
