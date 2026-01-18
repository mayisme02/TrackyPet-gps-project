import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  Text,
  TextInput,
  Platform,
  Image,
} from "react-native";
import MapView, {
  Marker,
  Region,
  Callout,
  Circle,
  Polyline,
  MapPressEvent,
} from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Slider from "@react-native-community/slider";

/* ================= CONFIG ================= */
const BACKEND_URL = "http://localhost:3000";
const MIN_MOVE_DISTANCE = 5;

/* ================= TYPES ================= */
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

type Device = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  type?: string;
};

/* ================= HAVERSINE ================= */
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

  /* ================= MAP ================= */
  const [initialRegion] = useState<Region>({
    latitude: 16.4755,
    longitude: 102.825,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  /* ================= CORE STATE ================= */
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [tempCode, setTempCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [rawPath, setRawPath] = useState<TrackPoint[]>([]);
  const [displayPath, setDisplayPath] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [accumulatedDistance, setAccumulatedDistance] = useState(0);
  const [petPhotoURL, setPetPhotoURL] = useState<string | null>(null);
  const petMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const [restorePetCallout, setRestorePetCallout] = useState(false);
  const [petLocation, setPetLocation] = useState<DeviceLocation | null>(null);
  const [markerReady, setMarkerReady] = useState(false);
  const [petMarkerKey, setPetMarkerKey] = useState(0);

  /* ================= GEOFENCE ================= */
  const [isGeofenceMode, setIsGeofenceMode] = useState(false);
  const [geofenceCenter, setGeofenceCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(300);
  const [showGeofenceUI, setShowGeofenceUI] = useState(false);

  /* ================= LOAD PET IMAGE ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceCode) {
      setPetPhotoURL(null);
      return;
    }

    return onSnapshot(
      doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceCode),
      (snap) => {
        setPetPhotoURL(snap.exists() ? snap.data().photoURL ?? null : null);
      }
    );
  }, [deviceCode]);

  /* ================= FORMAT ================= */
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

  /* ================= PATH ================= */
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

        // นับระยะเฉพาะเคลื่อนที่จริง
        if (dist >= MIN_MOVE_DISTANCE) {
          setAccumulatedDistance((d) => d + dist);
        } else {
          return prev;
        }
      }
      return [...prev, point];
    });

    setDisplayPath((prev) => {
      if (prev.length === 0) {
        return [{ latitude: point.latitude, longitude: point.longitude }];
      }

      const last = prev[prev.length - 1];
      const dist = distanceInMeters(
        last.latitude,
        last.longitude,
        point.latitude,
        point.longitude
      );

      if (dist < MIN_MOVE_DISTANCE) return prev;

      return [...prev, { latitude: point.latitude, longitude: point.longitude }];
    });
  };


  /* ================= FETCH ================= */
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
      setPetLocation(current);

      appendPoint({
        latitude: current.latitude,
        longitude: current.longitude,
        timestamp,
      });

      return true;
    } catch {
      if (!options?.silent) {
        Alert.alert("ไม่พบอุปกรณ์", "กรุณาตรวจสอบรหัสอุปกรณ์");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* ================= MAP PRESS (GEOFENCE) ================= */
  const onMapPress = (e: MapPressEvent) => {
    if (!isGeofenceMode) return;
    setGeofenceCenter(e.nativeEvent.coordinate);
    setShowGeofenceUI(true);
    setIsGeofenceMode(false);
  };

  /* ================= AUTO TRACK ================= */
  useEffect(() => {
    if (!deviceCode || !isTracking) return;
    const timer = setInterval(
      () => fetchLocation(deviceCode, { silent: true }),
      5000
    );
    return () => clearInterval(timer);
  }, [deviceCode, isTracking]);

  /* ================= LOAD ACTIVE DEVICE ================= */
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const active = await AsyncStorage.getItem("activeDevice");
        if (!active) {
          setDeviceCode(null);
          setLocation(null);
          // ล้าง marker สัตว์เลี้ยง
          setPetLocation(null);
          setPetPhotoURL(null);
          setMarkerReady(false);
          // ล้างเส้นทาง
          setRawPath([]);
          setDisplayPath([]);
          setAccumulatedDistance(0);
          setIsTracking(false);
          return;
        }

        setDeviceCode(active);
        setIsTracking(false);
      };
      load();
    }, [])
  );

  useEffect(() => {
    if (!restorePetCallout || !petLocation) return;

    setTimeout(() => {
      petMarkerRef.current?.showCallout();
      setRestorePetCallout(false);
    }, 300);
  }, [restorePetCallout, petLocation]);

  /* ================= ADD DEVICE (UNIFIED) ================= */
  const confirmAddDevice = async () => {
    const code = tempCode.trim().toUpperCase();
    if (!code) return;

    const stored = await AsyncStorage.getItem("devices");
    const list: Device[] = stored ? JSON.parse(stored) : [];

    if (list.some((d) => d.code === code)) {
      Alert.alert("อุปกรณ์ถูกเพิ่มแล้ว");
      return;
    }

    const ok = await fetchLocation(code);
    if (!ok) return;

    const newDevice: Device = {
      id: Date.now().toString(),
      code,
      type: "GPS_TRACKER_A7670",
      name: "LilyGo A7670E",
      createdAt: new Date().toISOString(),
    };

    const updated = [...list, newDevice];
    await AsyncStorage.setItem("devices", JSON.stringify(updated));
    await AsyncStorage.setItem("activeDevice", code);

    setDeviceCode(code);
    setIsTracking(true);
    setModalVisible(false);
    setTempCode("");
  };
  const cancelGeofence = () => {
    setShowGeofenceUI(false);
    setGeofenceCenter(null);
    setGeofenceRadius(10);

    // บังคับ redraw marker
    setMarkerReady(false);
    setPetMarkerKey((k) => k + 1);
  };


  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={onMapPress}
      >
        {displayPath.length > 1 && (
          <Polyline
            coordinates={displayPath}
            strokeColor="#875100"
            strokeWidth={8}
          />
        )}

        {geofenceCenter && (
          <>
            <Circle
              center={geofenceCenter}
              radius={geofenceRadius}
              strokeColor="rgba(140,176,158,0.9)"   // #8CB09E
              fillColor="rgba(203,223,225,0.55)"    // #CBE0E1
            />
            <Marker
              coordinate={geofenceCenter}
              draggable
              onDragEnd={(e) =>
                setGeofenceCenter(e.nativeEvent.coordinate)
              }
            >
              <MaterialIcons name="location-on" size={42} color="#2E7D32" />
            </Marker>
          </>
        )}

        {petLocation && (
          <Marker
            key={`pet-marker-${petMarkerKey}`}   // ⭐ สำคัญมาก
            ref={petMarkerRef}
            coordinate={{
              latitude: petLocation.latitude,
              longitude: petLocation.longitude,
            }}
            tracksViewChanges={!markerReady}
            anchor={{ x: 0.5, y: 0.5 }}
          >

            {petPhotoURL ? (
              <View
                style={styles.petMarker}
                onLayout={() => setMarkerReady(true)} // ⭐
              >
                <Image
                  source={{ uri: petPhotoURL }}
                  style={styles.petImage}
                  onLoadEnd={() => setMarkerReady(true)} // ⭐
                />
              </View>
            ) : (
              <View
                style={styles.pawMarker}
                onLayout={() => setMarkerReady(true)} // ⭐
              >
                <MaterialIcons name="pets" size={26} color="#7A4A00" />
              </View>
            )}

            <Callout tooltip>
              <View style={styles.calloutWrapper}>
                <View style={styles.calloutHandle} />
                <View style={styles.calloutCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>GPS Tracker</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        ± {petLocation.accuracy ?? 30} ม.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.row}>
                    <Text style={styles.icon}>📅</Text>
                    <Text style={styles.text}>
                      {formatThaiDate(petLocation.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.icon}>🕒</Text>
                    <Text style={styles.text}>
                      {formatThaiTime(petLocation.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.monoText}>
                      {petLocation.latitude.toFixed(6)},{" "}
                      {petLocation.longitude.toFixed(6)}
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
        )}
      </MapView>

      {/* ===== FABs ===== */}
      <TouchableOpacity
        style={styles.geofenceFab}
        onPress={() => {
          Alert.alert("ตั้งค่า Geofence", "แตะบนแผนที่เพื่อกำหนดตำแหน่ง");
          setIsGeofenceMode(true);
        }}
      >
        <MaterialIcons name="location-searching" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addFab}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add-circle-outline" size={30} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: deviceCode ? "#0b1d51" : "#aaa" },
        ]}
        disabled={!deviceCode}
        onPress={() => {
          if (!deviceCode) return;
          setIsTracking(true);
          fetchLocation(deviceCode);

        }}
      >
        <MaterialIcons name="my-location" size={26} color="#fff" />
      </TouchableOpacity>

      {showGeofenceUI && (
        <View style={styles.geofencePanel}>
          <Text style={styles.geofenceTitle}>
            รัศมี {geofenceRadius} เมตร
          </Text>

          <Slider
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={geofenceRadius}
            onValueChange={setGeofenceRadius}
          />

          <View style={styles.geofenceActionRow}>
            {/* ยกเลิก */}
            <TouchableOpacity
              style={[styles.geofenceBtn, styles.geofenceCancelBtn]}
              onPress={cancelGeofence}
            >
              <Text style={styles.geofenceCancelText}>ยกเลิก</Text>
            </TouchableOpacity>

            {/* ยืนยัน */}
            <TouchableOpacity
              style={[styles.geofenceBtn, styles.geofenceConfirmBtn]}
              onPress={() => setShowGeofenceUI(false)}
            >
              <Text style={styles.geofenceConfirmText}>ยืนยัน</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* ===== ADD DEVICE MODAL ===== */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>เพิ่มอุปกรณ์ติดตาม</Text>

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
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.submitText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={loading}
                onPress={confirmAddDevice}
              >
                <Text style={styles.submitText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1 },

  petMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F4C430",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  petImage: { width: 46, height: 46, borderRadius: 23 },
  pawMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

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
  geofenceFab: {
    position: "absolute",
    bottom: 230,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
  },

  geofencePanel: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 12,
  },
  geofenceTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  geofenceActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  geofenceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  geofenceCancelBtn: {
    backgroundColor: "#E5E7EB",
  },

  geofenceConfirmBtn: {
    backgroundColor: "#905b0dff",
  },

  geofenceCancelText: {
    color: "#374151",
    fontWeight: "600",
  },

  geofenceConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },

  confirmBtn: {
    marginTop: 12,
    backgroundColor: "#1a73e8",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  calloutWrapper: { alignItems: "center" }, calloutHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: "#e0e0e0", marginBottom: 8, }, calloutCard: { backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, minWidth: 280, elevation: 6, }, cardHeader: { flexDirection: "row", justifyContent: "space-between", }, cardTitle: { fontSize: 16, fontWeight: "700" }, badge: { backgroundColor: "#e8f0fe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, }, badgeText: { color: "#1a73e8", fontSize: 12, fontWeight: "600" }, divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 }, row: { flexDirection: "row", alignItems: "center", marginTop: 6 }, icon: { fontSize: 16, marginRight: 8 }, text: { fontSize: 14.5, color: "#333" }, monoText: { fontSize: 14, color: "#444", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", }, boldText: { fontSize: 15, fontWeight: "700", color: "#111" },

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
    padding: 12,
    marginBottom: 12,
  },
  modalRow: { flexDirection: "row", gap: 10 },
  submitBtn: {
    flex: 1,
    backgroundColor: "#905b0d",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16 },
});