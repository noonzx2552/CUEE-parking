// ============================================================
//  SmartPark ESP32 Sensor Controller
//  4x Ultrasonic (HC-SR04) + 4x LED Red + 4x LED Green
// ============================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include "mbedtls/md.h"

const char* WIFI_SSID = "pmats";
const char* WIFI_PASSWORD = "12345678";

// Update this domain when you move to the real public domain.
const char* SERVER_URL = "https://novel-occupational-attribute-blocked.trycloudflare.com/parking/update.php";
const char* DEVICE_API_KEY = "change-this-device-key";

const int TRIG[4] = {18, 19, 25, 32};
const int ECHO[4] = {5, 21, 26, 33};

const int LED_RED[4] = {13, 14, 33, 15};
const int LED_GREEN[4] = {12, 27, 32, 2};

const char* SLOT_NAMES[4] = {"A1", "A2", "A3", "A4"};
const int THRESHOLD_CM = 13;

String slotStatus[4] = {"vacant", "vacant", "vacant", "vacant"};

long measureDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 999;
  return duration * 0.034 / 2;
}

String hexHmacSha256(const String& payload, const char* key) {
  unsigned char hmacResult[32];
  char hexOutput[65];

  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_setup(&ctx, info, 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char*)key, strlen(key));
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)payload.c_str(), payload.length());
  mbedtls_md_hmac_finish(&ctx, hmacResult);
  mbedtls_md_free(&ctx);

  for (int i = 0; i < 32; i++) {
    sprintf(&hexOutput[i * 2], "%02x", hmacResult[i]);
  }
  hexOutput[64] = '\0';
  return String(hexOutput);
}

void sendStatus(const char* slot, const char* status) {
  if (WiFi.status() != WL_CONNECTED) return;

  String body = "{\"slot\":\"";
  body += slot;
  body += "\",\"status\":\"";
  body += status;
  body += "\",\"source\":\"sensor\"}";

  unsigned long currentEpoch = (unsigned long) time(nullptr);
  if (currentEpoch < 100000) {
    Serial.println("  -> Skipped send: time not synced yet");
    return;
  }

  String timestamp = String(currentEpoch);
  String signature = hexHmacSha256(timestamp + "." + body, DEVICE_API_KEY);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);
  http.addHeader("X-Timestamp", timestamp);
  http.addHeader("X-Signature", signature);

  int code = http.POST(body);
  Serial.printf("  -> POST %s = %s (HTTP %d)\n", slot, status, code);
  http.end();
}

void setLED(int index, bool occupied) {
  digitalWrite(LED_RED[index], occupied ? HIGH : LOW);
  digitalWrite(LED_GREEN[index], occupied ? LOW : HIGH);
}

void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing NTP time");

  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 100000 && attempts < 30) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }

  Serial.println();
  if (now >= 100000) {
    Serial.println("Time synced");
  } else {
    Serial.println("Time sync failed");
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nSmartPark ESP32 Starting...");

  for (int i = 0; i < 4; i++) {
    pinMode(TRIG[i], OUTPUT);
    pinMode(ECHO[i], INPUT);
    pinMode(LED_RED[i], OUTPUT);
    pinMode(LED_GREEN[i], OUTPUT);
    setLED(i, false);
  }

  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  syncClock();

  for (int i = 0; i < 4; i++) {
    sendStatus(SLOT_NAMES[i], "vacant");
    delay(200);
  }
}

void loop() {
  for (int i = 0; i < 4; i++) {
    long dist = measureDistance(TRIG[i], ECHO[i]);
    String newStatus = (dist < THRESHOLD_CM) ? "occupied" : "vacant";

    Serial.printf("Slot %s: %ld cm -> %s\n", SLOT_NAMES[i], dist, newStatus.c_str());

    if (newStatus != slotStatus[i]) {
      slotStatus[i] = newStatus;
      setLED(i, newStatus == "occupied");
      sendStatus(SLOT_NAMES[i], newStatus.c_str());
    }

    delay(100);
  }

  delay(500);
}
