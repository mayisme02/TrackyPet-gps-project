import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  Text,
  TextInput,
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
const MOVE_THRESHOLD = 10; // เมตร

type DeviceLocation = {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
};

/* ===============================
   HAVERSINE DISTANCE
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

export default function Map2() {
  const mapRef = useRef<MapView>(null);

  /* ---------- MAP ---------- */
  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  /* ---------- STATE ---------- */
  const [deviceCode, setDeviceCode] = useState("");
  const [modalVisible, setModalVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const [location, setLocation] = useState<DeviceLocation | null>(null);

  const [path, setPath] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const [lastRecordedPoint, setLastRecordedPoint] =
    useState<{ latitude: number; longitude: number } | null>(null);

  const [accumulatedDistance, setAccumulatedDistance] = useState(0);

  /* ---------- CALENDAR ---------- */
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0] // YYYY-MM-DD
  );

  /* ---------- FORMAT ---------- */
  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  /* ===============================
     FETCH LOCATION
  ================================ */
  const fetchLocation = async () => {
    if (!deviceCode) {
      setModalVisible(true);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/api/device/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      const current = {
        latitude: data.latitude,
        longitude: data.longitude,
      };

      const timestamp = data.timestamp ?? new Date().toISOString();

      setLocation({
        ...current,
        timestamp,
        accuracy: data.acc ?? 30,
      });

      // จุดแรก
      if (!lastRecordedPoint) {
        setPath([current]);
        setLastRecordedPoint(current);
        setAccumulatedDistance(0);
        return;
      }

      const dist = distanceInMeters(
        lastRecordedPoint.latitude,
        lastRecordedPoint.longitude,
        current.latitude,
        current.longitude
      );

      const total = accumulatedDistance + dist;

      // ❌ GPS สั่น / อยู่นิ่ง
      if (total < MOVE_THRESHOLD) {
        setAccumulatedDistance(total);
        return;
      }

      // ✅ เคลื่อนที่จริง
      setPath((prev) => [...prev, current]);
      setLastRecordedPoint(current);
      setAccumulatedDistance(0);

      mapRef.current?.animateToRegion(
        {
          latitude: current.latitude,
          longitude: current.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
    } catch {
      Alert.alert("ไม่สามารถดึงตำแหน่งได้");
    } finally {
      setLoading(false);
    }
  };

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
        {/* 🔵 เส้นทาง */}
        {path.length > 1 && (
          <Polyline
            coordinates={path}
            strokeColor="#875100"
            strokeWidth={10}
          />
        )}

        {/* 📍 ตำแหน่งปัจจุบัน */}
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
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>LilyGo A7670E</Text>
                  <Text>📅 {formatThaiDate(location.timestamp)}</Text>
                  <Text>🕒 {formatThaiTime(location.timestamp)}</Text>
                  <Text>
                    📍 {location.latitude.toFixed(6)},{" "}
                    {location.longitude.toFixed(6)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          </>
        )}
      </MapView>

      {/* 📅 Calendar Button */}
      <TouchableOpacity
        style={styles.calendarFab}
        onPress={() => setCalendarVisible(true)}
      >
        <MaterialIcons name="calendar-today" size={22} color="#fff" />
      </TouchableOpacity>

      {/* 📍 Locate */}
      <TouchableOpacity
        style={styles.fab}
        onPress={fetchLocation}
        disabled={loading}
      >
        <MaterialIcons name="my-location" size={26} color="#fff" />
      </TouchableOpacity>

      {/* 🗑 Clear */}
      <TouchableOpacity
        style={styles.clearFab}
        onPress={() => {
          setPath([]);
          setLastRecordedPoint(null);
          setAccumulatedDistance(0);
        }}
      >
        <MaterialIcons name="delete" size={22} color="#fff" />
      </TouchableOpacity>

      {/* 🔐 Device Code Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>กรอกรหัสอุปกรณ์</Text>

            <TextInput
              style={styles.input}
              placeholder="เช่น PET-M3238-N3466"
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                if (!deviceCode) {
                  Alert.alert("กรุณากรอกรหัสอุปกรณ์");
                  return;
                }
                setModalVisible(false);
                fetchLocation();
              }}
            >
              <Text style={{ color: "#fff" }}>ยืนยัน</Text>
            </TouchableOpacity>
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
                console.log("Selected date:", day.dateString);
              }}
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={{ color: "#fff" }}>ปิด</Text>
            </TouchableOpacity>
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
    backgroundColor: "#0b1d51",
    justifyContent: "center",
    alignItems: "center",
  },

  clearFab: {
    position: "absolute",
    bottom: 150,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#c62828",
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
    elevation: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    minWidth: 260,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
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

  calendarBox: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
  },

  closeBtn: {
    marginTop: 12,
    backgroundColor: "#0b1d51",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
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
    padding: 10,
    marginBottom: 12,
  },

  submitBtn: {
    backgroundColor: "#0b1d51",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});