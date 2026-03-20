<?php

class MongoStore
{
    private string $database;
    private string $mode;
    private ?MongoDB\Driver\Manager $manager = null;
    private ?string $dataApiUrl = null;
    private ?string $dataApiKey = null;
    private ?string $dataSource = null;

    public function __construct()
    {
        $this->database = env('MONGODB_DATABASE', 'smartpark') ?? 'smartpark';

        $uri = env('MONGODB_URI');
        if ($uri !== null && extension_loaded('mongodb')) {
            $this->mode = 'driver';
            $this->manager = new MongoDB\Driver\Manager($uri);
            return;
        }

        $dataApiUrl = env('MONGODB_DATA_API_URL');
        $dataApiKey = env('MONGODB_DATA_API_KEY');
        $dataSource = env('MONGODB_DATA_SOURCE', 'Cluster0');

        if ($dataApiUrl !== null && $dataApiKey !== null && $dataSource !== null) {
            $this->mode = 'data_api';
            $this->dataApiUrl = rtrim($dataApiUrl, '/');
            $this->dataApiKey = $dataApiKey;
            $this->dataSource = $dataSource;
            return;
        }

        throw new RuntimeException(
            'MongoDB is not configured. Set MONGODB_URI or MONGODB_DATA_API_URL/MONGODB_DATA_API_KEY in .env'
        );
    }

    public function find(string $collection, array $filter = [], array $options = []): array
    {
        if ($this->mode === 'driver') {
            $queryOptions = [];

            if (isset($options['sort'])) {
                $queryOptions['sort'] = $options['sort'];
            }
            if (isset($options['limit'])) {
                $queryOptions['limit'] = (int) $options['limit'];
            }
            if (isset($options['projection'])) {
                $queryOptions['projection'] = $options['projection'];
            }

            $query = new MongoDB\Driver\Query($filter, $queryOptions);
            $cursor = $this->manager?->executeQuery($this->namespace($collection), $query);
            return $this->normalize(iterator_to_array($cursor ?? []));
        }

        $payload = [
            'dataSource' => $this->dataSource,
            'database' => $this->database,
            'collection' => $collection,
            'filter' => $filter,
        ];

        if (isset($options['sort'])) {
            $payload['sort'] = $options['sort'];
        }
        if (isset($options['limit'])) {
            $payload['limit'] = (int) $options['limit'];
        }
        if (isset($options['projection'])) {
            $payload['projection'] = $options['projection'];
        }

        $response = $this->callDataApi('find', $payload);
        return $this->normalize($response['documents'] ?? []);
    }

    public function findOne(string $collection, array $filter = [], array $options = []): ?array
    {
        $options['limit'] = 1;
        $documents = $this->find($collection, $filter, $options);
        return $documents[0] ?? null;
    }

    public function insertOne(string $collection, array $document): array
    {
        if (!isset($document['_id'])) {
            $document['_id'] = bin2hex(random_bytes(12));
        }

        if ($this->mode === 'driver') {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->insert($document);
            $this->manager?->executeBulkWrite($this->namespace($collection), $bulk);
            return $document;
        }

        $payload = [
            'dataSource' => $this->dataSource,
            'database' => $this->database,
            'collection' => $collection,
            'document' => $document,
        ];
        $this->callDataApi('insertOne', $payload);
        return $document;
    }

    public function updateOne(string $collection, array $filter, array $set, array $options = []): void
    {
        $upsert = (bool) ($options['upsert'] ?? false);

        if ($this->mode === 'driver') {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->update($filter, ['$set' => $set], ['multi' => false, 'upsert' => $upsert]);
            $this->manager?->executeBulkWrite($this->namespace($collection), $bulk);
            return;
        }

        $payload = [
            'dataSource' => $this->dataSource,
            'database' => $this->database,
            'collection' => $collection,
            'filter' => $filter,
            'update' => ['$set' => $set],
            'upsert' => $upsert,
        ];
        $this->callDataApi('updateOne', $payload);
    }

    public function updateMany(string $collection, array $filter, array $set): void
    {
        if ($this->mode === 'driver') {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->update($filter, ['$set' => $set], ['multi' => true, 'upsert' => false]);
            $this->manager?->executeBulkWrite($this->namespace($collection), $bulk);
            return;
        }

        $payload = [
            'dataSource' => $this->dataSource,
            'database' => $this->database,
            'collection' => $collection,
            'filter' => $filter,
            'update' => ['$set' => $set],
        ];
        $this->callDataApi('updateMany', $payload);
    }

    private function namespace(string $collection): string
    {
        return $this->database . '.' . $collection;
    }

    private function callDataApi(string $action, array $payload): array
    {
        $endpoint = $this->dataApiUrl . '/action/' . $action;
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'api-key: ' . $this->dataApiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);

        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false || $curlError !== '') {
            throw new RuntimeException('MongoDB Data API request failed: ' . $curlError);
        }

        $response = json_decode($raw, true);
        if ($httpCode >= 400) {
            $message = $response['error'] ?? $response['detail'] ?? 'Unknown MongoDB Data API error';
            throw new RuntimeException('MongoDB Data API error: ' . $message);
        }

        return is_array($response) ? $response : [];
    }

    private function normalize(mixed $value): mixed
    {
        if (is_array($value)) {
            $normalized = [];
            foreach ($value as $key => $item) {
                $normalized[$key] = $this->normalize($item);
            }
            return $normalized;
        }

        if ($value instanceof stdClass) {
            return $this->normalize(get_object_vars($value));
        }

        return $value;
    }
}
