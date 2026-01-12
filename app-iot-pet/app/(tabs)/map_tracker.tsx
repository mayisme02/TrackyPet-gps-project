import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  Text,
  TextInput,
  Platform,
} from "react-native";
import MapView, {
  Marker,
  Region,
  Callout,
  Circle,
  Polyline,
} from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

/* ===============================
   CONFIG
================================ */
const BACKEND_URL = "http://localhost:3000";
const MOVE_DISTANCE_THRESHOLD = 10; // ✅ นับระยะทางเฉพาะ > 10 เมตร

type DeviceLocation = {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
};

type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

/* ===============================
   HAVERSINE
================================ */
function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapTracker() {
  const mapRef = useRef<MapView>(null);

  /* ---------- MAP ---------- */
  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  /* ---------- STATE ---------- */
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [tempCode, setTempCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [userOpenAddModal, setUserOpenAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [rawPath, setRawPath] = useState<TrackPoint[]>([]);
  const [displayPath, setDisplayPath] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [accumulatedDistance, setAccumulatedDistance] = useState(0);

  /* ---------- CALENDAR ---------- */
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  /* ---------- FORMAT ---------- */
  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  /* ===============================
     APPEND POINT (FIXED DISTANCE)
  ================================ */
  const appendPoint = (point: TrackPoint) => {
    setRawPath((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = distanceInMeters(
          last.latitude,
          last.longitude,
          point.latitude,
          point.longitude
        );

        // ✅ นับระยะทางเฉพาะตอนขยับจริง
        if (dist >= MOVE_DISTANCE_THRESHOLD) {
          setAccumulatedDistance((d) => d + dist);
        }
      }
      return [...prev, point];
    });

    setDisplayPath((prev) => {
      if (prev.length === 0)
        return [{ latitude: point.latitude, longitude: point.longitude }];

      const last = prev[prev.length - 1];
      const dist = distanceInMeters(
        last.latitude,
        last.longitude,
        point.latitude,
        point.longitude
      );

      if (dist < 3) return prev;
      return [...prev, { latitude: point.latitude, longitude: point.longitude }];
    });
  };

  /* ===============================
     FETCH LOCATION
  ================================ */
  const fetchLocation = async (
    code: string,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/api/device/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: code }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const timestamp = data.timestamp ?? new Date().toISOString();

      const current: DeviceLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp,
        accuracy: data.acc ?? 30,
      };

      setLocation(current);
      appendPoint({
        latitude: current.latitude,
        longitude: current.longitude,
        timestamp,
      });

      return true;
    } catch {
      if (!options?.silent) {
        Alert.alert("ไม่พบอุปกรณ์", "กรุณาป้อนรหัสอุปกรณ์ใหม่");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     AUTO TRACK
  ================================ */
  useEffect(() => {
    if (!deviceCode || !isTracking) return;

    const timer = setInterval(() => {
      fetchLocation(deviceCode, { silent: true });
    }, 5000);

    return () => clearInterval(timer);
  }, [deviceCode, isTracking]);

  /* ===============================
     UI
  ================================ */
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
      >
        {displayPath.length > 1 && (
          <Polyline
            coordinates={displayPath}
            strokeColor="#875100"
            strokeWidth={6}
          />
        )}

        {location && (
          <>
            <Circle
              center={location}
              radius={location.accuracy ?? 30}
              strokeColor="rgba(26,115,232,0.4)"
              fillColor="rgba(26,115,232,0.18)"
            />

            <Marker coordinate={location}>
              <Callout tooltip>
                <View style={styles.calloutWrapper}>
                  <View style={styles.calloutHandle} />

                  <View style={styles.calloutCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>LilyGo A7670E</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          ± {location.accuracy ?? 30} ม.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                      <Text style={styles.icon}>📅</Text>
                      <Text style={styles.text}>
                        {formatThaiDate(location.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.icon}>🕒</Text>
                      <Text style={styles.text}>
                        {formatThaiTime(location.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.icon}>📍</Text>
                      <Text style={styles.monoText}>
                        {location.latitude.toFixed(6)},{" "}
                        {location.longitude.toFixed(6)}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.icon}>📏</Text>
                      <Text style={styles.boldText}>
                        {accumulatedDistance.toFixed(1)} m
                      </Text>
                    </View>
                  </View>
                </View>
              </Callout>
            </Marker>
          </>
        )}
      </MapView>

      {/* ➕ Add Device */}
      <TouchableOpacity
        style={styles.addFab}
        onPress={() => {
          setIsTracking(false);
          setTempCode("");
          setUserOpenAddModal(true);
          setModalVisible(true);
        }}
      >
        <MaterialIcons name="add-circle-outline" size={30} color="#fff" />
      </TouchableOpacity>

      {/* 📍 Locate */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: deviceCode ? "#0b1d51" : "#aaa" },
        ]}
        disabled={!deviceCode || loading}
        onPress={() => {
          if (!deviceCode) return;
          setIsTracking(true);
          fetchLocation(deviceCode);
        }}
      >
        <MaterialIcons name="my-location" size={26} color="#fff" />
      </TouchableOpacity>

      {/* 📅 Calendar */}
      <TouchableOpacity
        style={styles.calendarFab}
        onPress={() => setCalendarVisible(true)}
      >
        <MaterialIcons name="calendar-today" size={22} color="#fff" />
      </TouchableOpacity>

      {/* 🔐 Add Device Modal */}
      <Modal
        visible={modalVisible && userOpenAddModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>เพิ่มอุปกรณ์</Text>

            <TextInput
              style={styles.input}
              placeholder="เช่น PET-001"
              value={tempCode}
              onChangeText={setTempCode}
              autoCapitalize="characters"
            />

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#aaa" }]}
                onPress={() => {
                  setModalVisible(false);
                  setUserOpenAddModal(false);
                  setTempCode("");
                }}
              >
                <Text style={{ color: "#fff" }}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={loading}
                onPress={async () => {
                  if (!tempCode.trim()) {
                    Alert.alert("กรุณากรอกรหัสอุปกรณ์");
                    return;
                  }

                  const ok = await fetchLocation(tempCode);
                  if (!ok) return;

                  setDeviceCode(tempCode);
                  setIsTracking(true);
                  setModalVisible(false);
                  setUserOpenAddModal(false);
                }}
              >
                <Text style={{ color: "#fff" }}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📅 Calendar Modal */}
      <Modal visible={calendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarBox}>
            <Calendar
              current={selectedDate}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#0b1d51",
                },
              }}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ===============================
   STYLES
================================ */
const styles = StyleSheet.create({
  container: { flex: 1 },

  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  addFab: {
    position: "absolute",
    bottom: 160,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#905b0d",
    justifyContent: "center",
    alignItems: "center",
  },

  calendarFab: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0b1d51",
    justifyContent: "center",
    alignItems: "center",
  },

  calloutWrapper: {
    alignItems: "center",
  },

  calloutHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    marginBottom: 8,
  },

  calloutCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  badge: {
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: {
    color: "#1a73e8",
    fontSize: 12,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  icon: {
    fontSize: 16,
    marginRight: 8,
  },

  text: {
    fontSize: 14.5,
    color: "#333",
  },

  monoText: {
    fontSize: 14,
    color: "#444",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  boldText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },

  modalRow: {
    flexDirection: "row",
    gap: 10,
  },

  calendarBox: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
  },

  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  submitBtn: {
    flex: 1,
    backgroundColor: "#905b0d",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
});