# SmartPark — ESP32 Sensor API Guide

คู่มือสำหรับนักพัฒนา firmware ESP32/Arduino ที่ต้องการส่งข้อมูลเซ็นเซอร์เข้าระบบ SmartPark

---

## Endpoint

```
POST https://spotsync-cuee.vercel.app/api/update
Content-Type: application/json
```

---

## Request Body

```json
{
  "slot":   "A1",
  "status": "occupied",
  "source": "sensor"
}
```

| Field    | Type   | ค่าที่ใช้ได้              | คำอธิบาย                        |
|----------|--------|--------------------------|----------------------------------|
| `slot`   | string | `"A1"` `"A2"` `"A3"` `"A4"` | ชื่อช่องจอด (ต้องตรงกับที่ตั้งค่าไว้ใน Vercel env `SMARTPARK_SLOTS`) |
| `status` | string | `"occupied"` / `"vacant"` | มีรถจอด / ไม่มีรถ |
| `source` | string | `"sensor"`               | ระบุว่าข้อมูลมาจากเซ็นเซอร์ (บังคับเมื่อใช้ API key) |

---

## Authentication

ทุก request จาก ESP32 ต้องแนบ **API Key** ใน header:

```
x-api-key: <DEVICE_API_KEY>
```

ค่า `DEVICE_API_KEY` ตั้งใน Vercel Environment Variables (ถามเจ้าของโปรเจกต์)

### รูปแบบที่ 1 — Simple Key (แนะนำสำหรับ ESP32)

ส่งแค่ `x-api-key` อย่างเดียว ระบบจะยืนยันว่า key ถูกต้องและอนุญาตผ่าน

### รูปแบบที่ 2 — HMAC-SHA256 (ปลอดภัยกว่า)

เพิ่ม header เหล่านี้เพื่อป้องกัน replay attack:

```
x-api-key:   <DEVICE_API_KEY>
x-timestamp: <Unix timestamp วินาที>
x-signature: HMAC-SHA256(<timestamp>.<raw JSON body>, key=DEVICE_API_KEY)
```

ตัวอย่าง HMAC string ที่ต้อง sign:
```
1710000000.{"slot":"A1","status":"occupied","source":"sensor"}
```

---

## Response

### สำเร็จ — `200 OK`

```json
{
  "success": true,
  "slot": "A1",
  "status": "occupied",
  "changed": true
}
```

`changed: true` = สถานะเปลี่ยนจากเดิม, `false` = ส่งค่าเดิมซ้ำ

### Error

| Status | ความหมาย |
|--------|-----------|
| `401`  | API key ผิด หรือ signature ไม่ถูกต้อง |
| `422`  | Body ไม่ครบ / slot หรือ status ไม่ถูกต้อง |
| `500`  | เซิร์ฟเวอร์หรือ DB มีปัญหา |

---

## ตัวอย่าง Arduino / ESP32 Code

### Simple Version (WiFi + HTTPClient)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ====== ตั้งค่า ======
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL       = "https://spotsync-cuee.vercel.app/api/update";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";   // ขอจากเจ้าของโปรเจกต์
const char* SLOT_NAME     = "A1";                      // เปลี่ยนตามตำแหน่งติดตั้ง

// ====== PIN เซ็นเซอร์ ======
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const float OCCUPIED_THRESHOLD_CM = 30.0;  // ระยะ ≤ 30 cm = มีรถ

bool lastStatus = false;  // false = vacant

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

void loop() {
  float distance = measureDistance();
  bool isOccupied = (distance > 0 && distance <= OCCUPIED_THRESHOLD_CM);

  // ส่งเฉพาะตอนสถานะเปลี่ยน
  if (isOccupied != lastStatus) {
    String status = isOccupied ? "occupied" : "vacant";
    Serial.printf("Status changed → %s (%.1f cm)\n", status.c_str(), distance);
    sendUpdate(status);
    lastStatus = isOccupied;
  }

  delay(1000);
}

float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // timeout 30 ms
  if (duration == 0) return -1;
  return duration * 0.034 / 2.0;
}

void sendUpdate(const String& status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);

  // สร้าง JSON body
  StaticJsonDocument<128> doc;
  doc["slot"]   = SLOT_NAME;
  doc["status"] = status;
  doc["source"] = "sensor";
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    Serial.println("✅ Update sent: " + status);
  } else {
    Serial.printf("❌ HTTP error: %d\n", httpCode);
    Serial.println(http.getString());
  }
  http.end();
}
```

---

### HMAC Version (ปลอดภัยกว่า — ต้องใช้ library mbedTLS)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/md.h"

const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* API_URL        = "https://spotsync-cuee.vercel.app/api/update";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";
const char* SLOT_NAME      = "A1";

String hmacSHA256(const String& key, const String& data) {
  byte result[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char*)key.c_str(), key.length());
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)data.c_str(), data.length());
  mbedtls_md_hmac_finish(&ctx, result);
  mbedtls_md_free(&ctx);

  String hex = "";
  for (int i = 0; i < 32; i++) {
    if (result[i] < 0x10) hex += "0";
    hex += String(result[i], HEX);
  }
  return hex;
}

void sendUpdateHMAC(const String& status) {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<128> doc;
  doc["slot"]   = SLOT_NAME;
  doc["status"] = status;
  doc["source"] = "sensor";
  String body;
  serializeJson(doc, body);

  // Timestamp (ต้องซิงค์ NTP ก่อน)
  String timestamp = String(time(nullptr));
  String sigData   = timestamp + "." + body;
  String signature = hmacSHA256(DEVICE_API_KEY, sigData);

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("x-api-key",     DEVICE_API_KEY);
  http.addHeader("x-timestamp",   timestamp);
  http.addHeader("x-signature",   signature);

  int httpCode = http.POST(body);
  Serial.printf("HMAC update → HTTP %d\n", httpCode);
  http.end();
}
```

> **หมายเหตุ HMAC:** ESP32 ต้องซิงค์เวลากับ NTP server ก่อน (`configTime`) มิฉะนั้น timestamp จะผิดและ server จะปฏิเสธ (window ±300 วินาที)

---

## NTP Time Sync (สำหรับ HMAC)

```cpp
#include <time.h>

void syncNTP() {
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");  // UTC+7
  Serial.print("Syncing NTP");
  while (time(nullptr) < 1000000000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" done");
}
// เรียกใน setup() หลัง WiFi connected
```

---

## Gate Control API (ไม้กั้น)

ESP32 ที่ควบคุมไม้กั้นให้ **poll** endpoint นี้ทุก 1 วินาที แล้วยกไม้เมื่อ `open: true`

### Endpoint

```
GET https://spotsync-cuee.vercel.app/api/gate/status?slot=A1&api_key=<DEVICE_API_KEY>
```

หรือส่ง header แทน query param ก็ได้:
```
GET /api/gate/status?slot=A1
x-api-key: <DEVICE_API_KEY>
```

### Response — ช่องเดียว

```json
{ "slot": "A1", "open": true,  "until": "2024-03-21T10:30:08.000Z" }
{ "slot": "A1", "open": false, "until": null }
```

### หลายช่องพร้อมกัน

```
GET /api/gate/status?slot=A1&slot=A2&api_key=<key>
GET /api/gate/status?slot=A1,A2,A3&api_key=<key>
```

```json
{
  "gates": [
    { "slot": "A1", "open": true,  "until": "2024-03-21T10:30:08.000Z" },
    { "slot": "A2", "open": false, "until": null },
    { "slot": "A3", "open": false, "until": null }
  ]
}
```

`open: true` จะคงอยู่ **8 วินาที** หลังจากมีการเปลี่ยนสถานะ (เข้า หรือ ออก)

### เมื่อไรไม้กั้นจะเปิด

| กรณี | trigger |
|------|---------|
| รถเข้า — ยืนยันช่องจอดในแอป | `POST /api/update` status: `occupied` |
| รถออก — ยืนยันชำระเงินในแอป | `POST /api/update` source: `checkout` |
| เซ็นเซอร์ตรวจจับรถ (ESP32 อื่น) | `POST /api/update` status: `occupied` source: `sensor` |

### โค้ด ESP32 สำหรับไม้กั้น

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* GATE_API_URL   = "https://spotsync-cuee.vercel.app/api/gate/status";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";
const char* GATE_SLOT      = "A1";   // ช่องที่ไม้กั้นนี้ดูแล ("entry" หรือชื่อ slot)

const int SERVO_PIN = 13;  // หรือ relay pin สำหรับ servo/motor
bool gateIsOpen = false;

void setup() {
  Serial.begin(115200);
  pinMode(SERVO_PIN, OUTPUT);
  digitalWrite(SERVO_PIN, LOW);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  Serial.println("WiFi connected");
}

void loop() {
  bool shouldOpen = checkGate();

  if (shouldOpen && !gateIsOpen) {
    openGate();
  } else if (!shouldOpen && gateIsOpen) {
    closeGate();
  }

  delay(1000);  // poll ทุก 1 วินาที
}

bool checkGate() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(GATE_API_URL) + "?slot=" + GATE_SLOT + "&api_key=" + DEVICE_API_KEY;
  http.begin(url);
  http.setTimeout(3000);

  int httpCode = http.GET();
  if (httpCode != 200) { http.end(); return false; }

  StaticJsonDocument<128> doc;
  deserializeJson(doc, http.getString());
  http.end();

  return doc["open"] | false;
}

void openGate() {
  Serial.println("🔓 Gate OPEN");
  digitalWrite(SERVO_PIN, HIGH);  // ปรับตามวงจรจริง (servo / relay)
  gateIsOpen = true;
}

void closeGate() {
  Serial.println("🔒 Gate CLOSE");
  digitalWrite(SERVO_PIN, LOW);
  gateIsOpen = false;
}
```

> **หมายเหตุ:** ถ้าใช้ Servo motor ให้แทน `digitalWrite` ด้วย `myServo.write(90)` / `myServo.write(0)` ตามมุมที่ต้องการ

---

## Slot Names

ชื่อช่องจอดที่ใช้ในระบบ (ต้องตรงกับ env var `SMARTPARK_SLOTS`):

| Slot | ตำแหน่ง |
|------|----------|
| A1   | ช่องที่ 1 |
| A2   | ช่องที่ 2 |
| A3   | ช่องที่ 3 |
| A4   | ช่องที่ 4 |

> เปลี่ยน `SLOT_NAME` ในโค้ดให้ตรงกับช่องที่ ESP32 ตัวนั้นรับผิดชอบ (1 ESP32 ต่อ 1 ช่อง)

---

## Flow การทำงานทั้งระบบ

```
[ทางเข้า]
รถมาถึง → สแกน QR ในแอป → ยืนยันช่องจอด
                                    │
                              POST /api/update
                              status: occupied
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                  MongoDB อัปเดต        gate_open_until = now+8s
                  LINE ticket ส่ง              │
                                    ESP32 gate poll → open ✓

[ระหว่างจอด]
ทุก 15 วินาที client ping /api/billing-tick
→ server คำนวณ elapsed จาก MongoDB start_time
→ ส่ง LINE Flex Message แจ้งค่าจอดทุกรอบ

[ทางออก]
กดยืนยันชำระเงิน → POST /api/update
                    status: vacant, source: checkout
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                  LINE receipt ส่ง      gate_open_until = now+8s
                                               │
                                    ESP32 gate poll → open ✓
```

---

## ข้อควรระวัง

- ส่ง request **เฉพาะตอนสถานะเปลี่ยน** เพื่อลด load เซิร์ฟเวอร์
- ถ้าเซ็นเซอร์กระพริบ (flicker) ให้เพิ่ม debounce delay ก่อนส่ง (เช่น รอ 2 วินาทีให้ค่าคงที่)
- `DEVICE_API_KEY` อย่า hardcode ใน code ที่ push ขึ้น public repo ให้ใช้ `#define` หรือ config file แยก
- Vercel free tier อาจ cold start ช้า 1-3 วินาทีในครั้งแรก เป็นเรื่องปกติ
