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
  Polyline,
  MapPressEvent,
} from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Slider from "@react-native-community/slider";
import { rtdb } from "../../firebase/firebase";
import { ref as dbRef, push } from "firebase/database";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ================= CONFIG ================= */
const BACKEND_URL = "http://192.168.31.135:3000";
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
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean | null>(null);
  const [geofencePoints, setGeofencePoints] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const [geofencePath, setGeofencePath] = useState<
    { latitude: number; longitude: number }[]
  >([]);


  const insets = useSafeAreaInsets();

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

  const geoInstruction =
    geofencePoints.length === 0
      ? "แตะบนแผนที่เพื่อเพิ่มจุด"
      : geofencePoints.length < 3
        ? "เพิ่มจุดให้ครบอย่างน้อย 3 จุด"
        : "ลากจุดเพื่อปรับตำแหน่ง หรือบันทึก";

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

      // ===== GEOFENCE CHECK =====
      if (geofenceCenter) {
        const distFromCenter = distanceInMeters(
          geofenceCenter.latitude,
          geofenceCenter.longitude,
          current.latitude,
          current.longitude
        );

        const inside = distFromCenter <= geofenceRadius;

        // เคยอยู่ข้างใน → ออกนอก
        if (isInsideGeofence === true && !inside) {
          sendGeofenceAlert("exit", distFromCenter);
          setIsInsideGeofence(false);
        }

        // เคยอยู่นอก → กลับเข้า
        if (isInsideGeofence === false && inside) {
          sendGeofenceAlert("enter", distFromCenter);
          setIsInsideGeofence(true);
        }

        // ครั้งแรก
        if (isInsideGeofence === null) {
          setIsInsideGeofence(inside);
        }
      }

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

    const coord = e.nativeEvent.coordinate;
    if (!coord) return;

    setGeofencePoints((prev) => [...prev, { ...coord }]);
  };

  const undoGeofencePoint = () => {
    setGeofencePoints((prev) => {
      if (prev.length === 0) return prev;

      return prev.slice(0, prev.length - 1);
    });
    setIsInsideGeofence(null);
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
    if (geofencePoints.length >= 2) {
      setGeofencePath([...geofencePoints]);
    } else {
      setGeofencePath([]);
    }
  }, [geofencePoints]);


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
    if (geofencePoints.length > 0) {
      Alert.alert(
        "ยกเลิกการตั้งค่า",
        "ข้อมูลที่กำหนดไว้จะหายไป",
        [
          { text: "ไม่ยกเลิก", style: "cancel" },
          {
            text: "ยกเลิก",
            style: "destructive",
            onPress: () => {
              setGeofencePoints([]);
              setIsGeofenceMode(false);
            },
          },
        ]
      );
      return;
    }

    setIsGeofenceMode(false);
  };


  const sendGeofenceAlert = async (type: "exit" | "enter", distance: number) => {
    if (!deviceCode) return;

    const now = new Date();
    const atUtc = now.toISOString();
    const atTh = now.toLocaleString("th-TH", {
      dateStyle: "long",
      timeStyle: "medium",
    });

    const message =
      type === "exit"
        ? `สัตว์เลี้ยงออกนอกพื้นที่ (${Math.round(distance)} ม.)`
        : `สัตว์เลี้ยงกลับเข้าพื้นที่`;

    await push(
      dbRef(rtdb, `devices/${deviceCode}/alerts`),
      {
        type,
        message,
        atUtc,
        atTh,
        radiusKm: geofenceRadius / 1000,
        device: deviceCode,
      }
    );
  };

  const saveGeofence = async () => {
    if (!deviceCode) {
      Alert.alert("ยังไม่ได้เลือกอุปกรณ์");
      return;
    }

    if (geofencePoints.length < 3) {
      Alert.alert("Geofence ไม่สมบูรณ์", "ต้องมีอย่างน้อย 3 จุด");
      return;
    }

    try {
      await push(
        dbRef(rtdb, `devices/${deviceCode}/geofence/history`),
        {
          type: "polygon",
          points: geofencePoints,
          createdAt: new Date().toISOString(),
        }
      );

      Alert.alert("บันทึกสำเร็จ", "Geofence ถูกบันทึกแล้ว");

      // ออกจากโหมดวาด
      setIsGeofenceMode(false);
      setShowGeofenceUI(false);
      setIsInsideGeofence(null);
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึก Geofence");
    }
  };

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
            zIndex={3}
          />
        )}

        {/* ===== GEOFENCE DRAW ===== */}
        {geofencePoints.length > 1 && (
          <Polyline
            coordinates={geofencePoints}
            strokeColor="#2E7D32"
            strokeWidth={3}
            lineDashPattern={[8, 6]} // เส้นประ
          />
        )}

        {geofencePoints.map((p, i) => {
          if (!p || p.latitude == null || p.longitude == null) return null;

          return (
            <Marker
              key={`gf-${i}`}
              coordinate={p}
              draggable
              onDragEnd={(e) => {
                const coord = e.nativeEvent.coordinate;
                if (!coord) return;

                setGeofencePoints((prev) => {
                  const next = [...prev];
                  next[i] = coord;
                  return next;
                });
              }}
            >
              <MaterialIcons
                name="radio-button-checked"
                size={18}
                color="#2E7D32"
              />
            </Marker>
          );
        })}

        {petLocation && (
          <Marker
            key={`pet-marker-${petMarkerKey}`}
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

      {isGeofenceMode && (
        <View
          style={[
            styles.geoBottomSheet,
            {
              bottom: 16 + insets.bottom + 56, 
            },
          ]}
        >
          <Text style={styles.geoTitle}>
            กำหนดพื้นที่ Geofence
          </Text>

          <Text style={styles.geoSubtitle}>
            {geofencePoints.length} จุด · แตะบนแผนที่
          </Text>



          <View style={styles.geoActionRow}>
            {/* ยกเลิก */}
            <TouchableOpacity
              style={[styles.geoBtn,
              styles.geoCancel]}
              onPress={cancelGeofence}
            >
              <Text style={styles.geoCancelText}>ยกเลิก</Text>
            </TouchableOpacity>

            {/* Undo */}
            <TouchableOpacity
              style={[
                styles.geoBtn,
                styles.geoUndo,
                geofencePoints.length === 0 && { opacity: 0.5 },
              ]}
              disabled={geofencePoints.length === 0}
              onPress={undoGeofencePoint}
            >
              <Text style={styles.geoUndoText}>Undo</Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              style={[
                styles.geoBtn,
                styles.geoSave,
                geofencePoints.length < 3 && styles.geoSaveDisabled,
              ]}
              disabled={geofencePoints.length < 3}
            >

              <Text style={styles.geoSaveText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== TOP FAB STACK ===== */}
      <View
        style={[
          styles.topFabContainer,
          { top: insets.top + 12 },
        ]}
      >
        {/* Geofence */}
        <TouchableOpacity
          style={[styles.topFab, { backgroundColor: "#c62828" }]}
          onPress={() => {
            setIsGeofenceMode(true);
          }}
        >
          <MaterialIcons name="location-searching" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Add device */}
        <TouchableOpacity
          style={[styles.topFab, { backgroundColor: "#905b0d" }]}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity
          style={[
            styles.topFab,
            { backgroundColor: deviceCode ? "#0b1d51" : "#aaa" },
          ]}
          disabled={!deviceCode}
          onPress={() => {
            if (!deviceCode) return;
            setIsTracking(true);
            fetchLocation(deviceCode);
          }}
        >
          <MaterialIcons name="my-location" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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

          <TouchableOpacity
            style={[
              styles.geofenceBtn,
              {
                backgroundColor:
                  geofencePoints.length === 0 ? "#ddd" : "#E5E7EB",
              },
            ]}
            disabled={geofencePoints.length === 0}
            onPress={undoGeofencePoint}
          >
            <Text style={{ color: "#374151", fontWeight: "600" }}>
              Undo จุดเส้นล่าสุด
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {geofencePath.length >= 2 && (
        <Polyline
          coordinates={geofencePath}
          strokeColor="#2E7D32"
          strokeWidth={3}
          lineDashPattern={[8, 6]}
          zIndex={4}
        />
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

  geoBottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    paddingVertical: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  geoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },

  geoActionRow: {
    flexDirection: "row",
    gap: 10,
  },

  geoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  geoCancel: {
    backgroundColor: "#E5E7EB",
  },

  geoSave: {
    backgroundColor: "#905b0dff",
  },

  geoUndo: {
    backgroundColor: "#F3F4F6",
    // borderWidth: 0.5,
    // borderColor: "#D1D5DB",
  },

  geoCancelText: {
    color: "#374151",
    fontWeight: "600",
  },

  geoUndoText: {
    color: "#111827",
    fontWeight: "600",
  },

  geoSaveText: {
    color: "#fff",
    fontWeight: "700",
  },

  topFabContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    gap: 12,
    zIndex: 20,
  },

  topFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  geoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
  },
  geoSaveDisabled: {
    backgroundColor: "#AE9367",
  },
  geoHint: {
    fontSize: 12,
    color: "#DC2626",
    textAlign: "center",
    marginTop: 6,
  },
});