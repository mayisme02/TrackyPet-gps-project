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
} from "react-native-maps";
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

  /* ---------- MAP ---------- */
  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const [location, setLocation] = useState<DeviceLocation | null>(null);

  /* ---------- DEVICE CODE ---------- */
  const [deviceCode, setDeviceCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
        Alert.alert("รหัสอุปกรณ์ไม่ถูกต้อง");
        setModalVisible(true);
        return;
      }

      if (!res.ok) throw new Error("BACKEND_ERROR");

      const data = await res.json();

      const pos: DeviceLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.acc ?? 30,
        state: data.state ?? "LOW_GPS",
        // ถ้าอุปกรณ์ไม่ส่งเวลา → ใช้เวลา app/server
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
      Alert.alert("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- BUTTON ---------- */
  const onPressLocate = () => {
    if (!deviceCode) {
      setModalVisible(true);
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
            {/* Accuracy Circle */}
            {location.accuracy && (
              <Circle
                center={location}
                radius={location.accuracy}
                strokeColor="rgba(244,67,54,0.4)"
                fillColor="rgba(244,67,54,0.18)"
              />
            )}

            <Marker
              coordinate={location}
              pinColor={getPinColor(location.state)}
            >
              <Callout tooltip>
                <View style={styles.card}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>LilyGo A7670E</Text>

                    {location.accuracy && (
                      <View style={styles.accBadge}>
                        <Text style={styles.accBadgeText}>
                          ± {Math.round(location.accuracy)} ม.
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.divider} />

                  {/* Date */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>📅</Text>
                    <Text style={styles.text}>
                      {formatThaiDate(location.timestamp)}
                    </Text>
                  </View>

                  {/* Time */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>🕒</Text>
                    <Text style={styles.text}>
                      {formatThaiTime(location.timestamp)} น.
                    </Text>
                  </View>

                  {/* Location */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.text}>
                      {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          </>
        )}
      </MapView>

      {/* Floating Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onPressLocate}
        disabled={loading}
      >
        <MaterialIcons name="my-location" size={26} color="#fff" />
      </TouchableOpacity>

      {/* DEVICE CODE MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>กรอกรหัสอุปกรณ์</Text>

            <TextInput
              style={styles.input}
              placeholder="เช่น PET-001"
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

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    minWidth: 260,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1c1c1e",
  },

  /* Accuracy badge */
  accBadge: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accBadgeText: {
    color: "#1565c0",
    fontSize: 12,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    color: "#333",
  },

  /* Modal */
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
});