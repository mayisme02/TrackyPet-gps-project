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
import MapView, { Marker, Region } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";

const BACKEND_URL = "http://localhost:3000";

export default function Map2() {
  const mapRef = useRef<MapView>(null);

  /* ---------- MAP ---------- */
  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /* ---------- DEVICE CODE ---------- */
  const [deviceCode, setDeviceCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  /* ---------- STATE ---------- */
  const [loading, setLoading] = useState(false);

  /* ===============================
     REAL FETCH (เรียก backend จริง)
  ================================ */
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

      if (!res.ok) {
        throw new Error("BACKEND_ERROR");
      }

      const data = await res.json();

      const pos = {
        latitude: data.latitude,
        longitude: data.longitude,
      };

      setLocation(pos);

      mapRef.current?.animateToRegion(
        {
          ...pos,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600
      );
    } catch (err) {
      console.error(err);
      Alert.alert("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     BUTTON HANDLER (จุดควบคุม flow)
  ================================ */
  const onPressLocate = () => {
    if (!deviceCode) {
      // ยังไม่เคยกรอก → เปิด modal
      setModalVisible(true);
      return;
    }

    // เคยกรอกแล้ว → ดึงพิกัดทันที
    fetchLocation();
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
        {location && (
          <Marker
            coordinate={location}
            title="ตำแหน่งอุปกรณ์"
          />
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

      {/* ===============================
          DEVICE CODE MODAL
      ================================ */}
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
                fetchLocation(); // 👈 สำคัญมาก
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