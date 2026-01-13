import * as React from "react";
import { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  Text,
  TextInput,
} from "react-native";
import MapView, { Marker, Region, Callout, Circle } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";

const BACKEND_URL = "http://localhost:3000";

type DeviceLocation = {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  state?: "MOVING" | "STOP" | "LOW_GPS";
};

export default function Map2() {
  const mapRef = useRef<MapView>(null);
  const inputRef = useRef<TextInput>(null);

  /* ---------- STATE ---------- */
  const [deviceCode, setDeviceCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<DeviceLocation | null>(null);

  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  /* ---------- UTIL ---------- */
  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const getPinColor = (state?: string) => {
    switch (state) {
      case "MOVING":
        return "green";
      case "STOP":
        return "orange";
      case "LOW_GPS":
        return "gray";
      default:
        return "red";
    }
  };

  /* ---------- ALERT + RETRY ---------- */
  const showRetryAlert = (message: string) => {
    Alert.alert("แจ้งเตือน", message, [
      {
        text: "OK",
        onPress: () => {
          setDeviceCode("");          // ล้างค่า
          setModalVisible(true);      // เปิด modal ใหม่
          requestAnimationFrame(() => inputRef.current?.focus());
        },
      },
    ]);
  };

  /* ---------- FETCH ---------- */
  const fetchLocation = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/api/device/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode }),
      });

      if (res.status === 401) {
        showRetryAlert("รหัสอุปกรณ์ไม่ถูกต้อง กรุณาลองใหม่");
        return;
      }

      if (!res.ok) throw new Error("BACKEND_ERROR");

      const data = await res.json();

      const pos: DeviceLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.acc ?? 30,
        state: data.state ?? "LOW_GPS",
        timestamp: data.timestamp ?? new Date().toISOString(),
      };

      setLocation(pos);

      mapRef.current?.animateToRegion(
        {
          latitude: pos.latitude,
          longitude: pos.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
    } catch {
      showRetryAlert("เชื่อมต่อไม่สำเร็จ กรุณากรอกรหัสอุปกรณ์ใหม่");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- BUTTON ---------- */
  const onPressLocate = () => {
    if (!deviceCode) {
      setModalVisible(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    fetchLocation();
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
      >
        {location && (
          <>
            {location.accuracy && (
              <Circle
                center={location}
                radius={location.accuracy}
                strokeColor="rgba(244,67,54,0.4)"
                fillColor="rgba(244,67,54,0.18)"
              />
            )}

            <Marker coordinate={location} pinColor={getPinColor(location.state)}>
              <Callout tooltip>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>LilyGo A7670E</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.row}>
                    <Text>📅 {formatThaiDate(location.timestamp)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>🕒 {formatThaiTime(location.timestamp)} น.</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>
                      📍 {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          </>
        )}
      </MapView>

      <TouchableOpacity
        style={styles.fab}
        onPress={onPressLocate}
        disabled={loading}
      >
        <MaterialIcons name="my-location" size={26} color="#fff" />
      </TouchableOpacity>

      {/* ---------- MODAL ---------- */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>กรอกรหัสอุปกรณ์</Text>

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="เช่น PET-001"
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
              onSubmitEditing={() => {
                if (!deviceCode) return;
                setModalVisible(false);
                fetchLocation();
              }}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                if (!deviceCode) return;
                setModalVisible(false);
                fetchLocation();
              }}
            >
              <Text style={{ color: "#fff" }}>ยืนยัน</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#fff" }}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

}

/* ---------- STYLES ---------- */
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    minWidth: 260,
  },

  cardHeader: { marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "600" },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

  row: { marginBottom: 6 },

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
  cancelBtn: {
    backgroundColor: "#888",
    padding: 12,  
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
});
