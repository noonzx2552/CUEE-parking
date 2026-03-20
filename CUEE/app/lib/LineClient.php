<?php

class LineClient
{
    private string $accessToken;

    public function __construct(?string $accessToken = null)
    {
        $this->accessToken = $accessToken ?? env('LINE_CHANNEL_ACCESS_TOKEN', '') ?? '';
    }

    public function isConfigured(): bool
    {
        return $this->accessToken !== '';
    }

    public function pushMessage(string $userId, array $messages): array
    {
        return $this->request('https://api.line.me/v2/bot/message/push', [
            'to' => $userId,
            'messages' => $messages,
        ]);
    }

    public function replyText(string $replyToken, string $text): array
    {
        return $this->request('https://api.line.me/v2/bot/message/reply', [
            'replyToken' => $replyToken,
            'messages' => [
                ['type' => 'text', 'text' => $text],
            ],
        ]);
    }

    public function pushParkingTicket(string $userId, string $slot, string $entranceTime): array
    {
        $message = [
            'type' => 'flex',
            'altText' => 'SmartPark E-Parking Ticket',
            'contents' => [
                'type' => 'bubble',
                'header' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'backgroundColor' => '#2563eb',
                    'contents' => [
                        ['type' => 'text', 'text' => 'SMART PARK', 'color' => '#ffffff', 'weight' => 'bold', 'size' => 'lg'],
                        ['type' => 'text', 'text' => 'E-Parking Ticket', 'color' => '#dbeafe', 'size' => 'xs'],
                    ],
                ],
                'body' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'spacing' => 'md',
                    'contents' => [
                        [
                            'type' => 'box',
                            'layout' => 'horizontal',
                            'contents' => [
                                ['type' => 'text', 'text' => 'Slot', 'color' => '#6b7280', 'size' => 'sm'],
                                ['type' => 'text', 'text' => $slot, 'align' => 'end', 'weight' => 'bold', 'size' => 'sm'],
                            ],
                        ],
                        [
                            'type' => 'box',
                            'layout' => 'horizontal',
                            'contents' => [
                                ['type' => 'text', 'text' => 'Entrance', 'color' => '#6b7280', 'size' => 'sm'],
                                ['type' => 'text', 'text' => $entranceTime . ' น.', 'align' => 'end', 'weight' => 'bold', 'size' => 'sm'],
                            ],
                        ],
                    ],
                ],
                'footer' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'contents' => [
                        ['type' => 'text', 'text' => 'ระบบจะส่งแจ้งเตือนเวลาจอดผ่าน LINE', 'size' => 'xs', 'color' => '#6b7280', 'align' => 'center'],
                    ],
                ],
            ],
        ];

        return $this->pushMessage($userId, [$message]);
    }

    private function request(string $url, array $payload): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('LINE_CHANNEL_ACCESS_TOKEN is not configured.');
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->accessToken,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false || $curlError !== '') {
            throw new RuntimeException('LINE API request failed: ' . $curlError);
        }

        $decoded = json_decode($raw, true);
        if ($httpCode >= 400) {
            $message = is_array($decoded) ? ($decoded['message'] ?? 'LINE API error') : 'LINE API error';
            throw new RuntimeException($message);
        }

        return is_array($decoded) ? $decoded : [];
    }
}
