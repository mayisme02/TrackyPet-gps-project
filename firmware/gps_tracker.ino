#define TINY_GSM_MODEM_A7670
#define TINY_GSM_RX_BUFFER 1024
#define MQTT_MAX_PACKET_SIZE 256

#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include "utilities.h"

// DEVICE 
#define DEVICE_ID "PET-ESP32-001"
#define DEVICE_NAME "Pet Tracker CSKKU"

// AIS SIM 
#define APN "internet"
#define GPRS_USER ""
#define GPRS_PASS ""

// MQTT (ThingsBoard Cloud EU - NO TLS) 
#define MQTT_BROKER "eu.thingsboard.cloud"
#define MQTT_PORT 1883
#define MQTT_CLIENTID DEVICE_ID
#define MQTT_USER "71jowsz9366p2xxel5po"
#define MQTT_PASS ""
#define MQTT_TOPIC "v1/devices/me/telemetry"

// SERIAL 
#define SerialMon Serial
#define SerialAT Serial1

TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
PubSubClient mqtt(gsmClient);

// FUNCTIONS
bool connectSIM() {
  Serial.println("📶 Connecting to AIS network...");

  if (!modem.waitForNetwork(30000)) {
    Serial.println("❌ Network not found");
    return false;
  }

  if (!modem.gprsConnect(APN, GPRS_USER, GPRS_PASS)) {
    Serial.println("❌ GPRS failed");
    return false;
  }

  Serial.println("📶 SIM CONNECTED (GPRS OK)");
  return true;
}

void connectMQTT() {
  static unsigned long lastTry = 0;
  if (millis() - lastTry < 5000) return;
  lastTry = millis();

  Serial.print("🔄 Connecting MQTT... ");
  if (mqtt.connect(MQTT_CLIENTID, MQTT_USER, MQTT_PASS)) {
    Serial.println("✅ CONNECTED");
  } else {
    Serial.print("❌ FAILED, rc=");
    Serial.println(mqtt.state());
  }
}

// SETUP 
void setup() {
  Serial.begin(115200);
  delay(3000);

  // Power modem
  pinMode(BOARD_PWRKEY_PIN, OUTPUT);
  digitalWrite(BOARD_PWRKEY_PIN, LOW);
  delay(100);
  digitalWrite(BOARD_PWRKEY_PIN, HIGH);
  delay(MODEM_POWERON_PULSE_WIDTH_MS);
  digitalWrite(BOARD_PWRKEY_PIN, LOW);

  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  delay(3000);

  while (!modem.testAT()) {
    delay(1000);
  }
  Serial.println("✅ Modem ready");

  // GPS 
  modem.enableGPS(MODEM_GPS_ENABLE_GPIO, MODEM_GPS_ENABLE_LEVEL);
  modem.setGPSBaud(115200);
  Serial.println("🛰️ GPS CONNECTED");

  // SIM 
  connectSIM();

  // MQTT 
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
}

// LOOP 
void loop() {

  if (!modem.isGprsConnected()) {
    Serial.println("⚠️ GPRS lost, reconnecting...");
    connectSIM();
    delay(3000);
    return;
  }

  if (!mqtt.connected()) {
    connectMQTT();
  }

  mqtt.loop();

  float lat, lon, speed, alt, acc;
  int vsat, usat;
  uint8_t fix;

  if (modem.getGPS(&fix, &lat, &lon, &speed, &alt,
                   &vsat, &usat, &acc,
                   nullptr, nullptr, nullptr,
                   nullptr, nullptr, nullptr)) {

    Serial.println("📍 GPS FIX");
    Serial.print("Lat: ");
    Serial.println(lat, 6);
    Serial.print("Lon: ");
    Serial.println(lon, 6);

    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"lat\":%.6f,\"lon\":%.6f,\"speed\":%.2f}",
             lat, lon, speed);

    mqtt.publish(MQTT_TOPIC, payload);
    Serial.println("✅ Sent to MQTT (ThingsBoard)");

  } else {
    Serial.println("❌ GPS not fixed yet");
  }

  delay(10000);
}