<?php

class ParkingRepository
{
    private MongoStore $store;
    private string $slotsCollection;
    private string $sessionsCollection;
    private string $lineUsersCollection;
    private array $defaultSlots;

    public function __construct(MongoStore $store)
    {
        $this->store = $store;
        $this->slotsCollection = env('MONGODB_SLOT_COLLECTION', 'slots') ?? 'slots';
        $this->sessionsCollection = env('MONGODB_SESSION_COLLECTION', 'parking_sessions') ?? 'parking_sessions';
        $this->lineUsersCollection = env('MONGODB_LINE_USERS_COLLECTION', 'line_users') ?? 'line_users';
        $this->defaultSlots = env_csv('PARKING_SLOTS', ['A1', 'A2', 'A3', 'A4']);
    }

    public function getSlotNames(): array
    {
        return $this->defaultSlots;
    }

    public function ensureDefaultSlots(): void
    {
        $existing = $this->store->find($this->slotsCollection, [], ['projection' => ['slot_name' => 1]]);
        $existingNames = array_map(static fn(array $slot): string => (string) ($slot['slot_name'] ?? ''), $existing);

        foreach ($this->defaultSlots as $slotName) {
            if (in_array($slotName, $existingNames, true)) {
                continue;
            }

            $now = now_iso8601();
            $this->store->insertOne($this->slotsCollection, [
                '_id' => 'slot_' . $slotName,
                'slot_name' => $slotName,
                'status' => 'vacant',
                'created_at' => $now,
                'updated_at' => $now,
                'updated_by' => 'system',
            ]);
        }
    }

    public function getSlots(): array
    {
        $this->ensureDefaultSlots();
        $slots = $this->store->find($this->slotsCollection, [], ['sort' => ['slot_name' => 1]]);

        usort(
            $slots,
            static fn(array $left, array $right): int => strcmp(
                (string) ($left['slot_name'] ?? ''),
                (string) ($right['slot_name'] ?? '')
            )
        );

        return array_map(
            static fn(array $slot): array => [
                'slot_name' => (string) ($slot['slot_name'] ?? ''),
                'status' => (string) ($slot['status'] ?? 'vacant'),
            ],
            $slots
        );
    }

    public function getSlot(string $slotName): ?array
    {
        $this->ensureDefaultSlots();
        return $this->store->findOne($this->slotsCollection, ['slot_name' => $slotName]);
    }

    public function setSlotStatus(string $slotName, string $status, string $source = 'system'): void
    {
        $this->ensureDefaultSlots();
        $this->store->updateOne(
            $this->slotsCollection,
            ['slot_name' => $slotName],
            [
                'slot_name' => $slotName,
                'status' => $status,
                'updated_at' => now_iso8601(),
                'updated_by' => $source,
            ],
            ['upsert' => true]
        );
    }

    public function endActiveSessions(string $slotName): void
    {
        $now = now_iso8601();
        $this->store->updateMany(
            $this->sessionsCollection,
            ['slot_name' => $slotName, 'ended' => false],
            [
                'ended' => true,
                'ended_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    public function createSession(
        string $slotName,
        string $lineUserId = '',
        ?int $duration = null,
        ?int $warn = null,
        string $source = 'system'
    ): array {
        $now = now_iso8601();
        $document = [
            '_id' => 'session_' . bin2hex(random_bytes(10)),
            'slot_name' => $slotName,
            'line_user_id' => $lineUserId,
            'start_time' => $now,
            'duration_minutes' => $duration ?? env_int('DEFAULT_PARKING_DURATION_MINUTES', 35),
            'warn_minutes' => $warn ?? env_int('DEFAULT_WARNING_MINUTES', 20),
            'ended' => false,
            'source' => $source,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        return $this->store->insertOne($this->sessionsCollection, $document);
    }

    public function getLatestActiveSession(string $slotName): ?array
    {
        return $this->store->findOne(
            $this->sessionsCollection,
            ['slot_name' => $slotName, 'ended' => false],
            ['sort' => ['created_at' => -1]]
        );
    }

    public function attachLineUserToActiveSession(string $slotName, string $lineUserId): bool
    {
        $session = $this->getLatestActiveSession($slotName);
        if ($session === null || empty($session['_id'])) {
            return false;
        }

        $this->store->updateOne(
            $this->sessionsCollection,
            ['_id' => $session['_id']],
            [
                'line_user_id' => $lineUserId,
                'updated_at' => now_iso8601(),
            ]
        );

        return true;
    }

    public function upsertLineUser(string $lineUserId, string $displayName): void
    {
        $now = now_iso8601();
        $this->store->updateOne(
            $this->lineUsersCollection,
            ['line_user_id' => $lineUserId],
            [
                'line_user_id' => $lineUserId,
                'display_name' => $displayName,
                'linked_at' => $now,
                'updated_at' => $now,
            ],
            ['upsert' => true]
        );
    }
}
