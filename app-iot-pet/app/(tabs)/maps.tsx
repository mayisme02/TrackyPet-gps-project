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
  Polygon,
} from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebase/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { rtdb } from "../../firebase/firebase";
import { ref as dbRef, push } from "firebase/database";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import DateTimePicker from "@react-native-community/datetimepicker";

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
  const [menuVisible, setMenuVisible] = useState(false);

  // ✅ Route modal state
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routePreset, setRoutePreset] = useState<"today" | "custom">("today");

  /* ================= GEOFENCE ================= */
  const [isGeofenceMode, setIsGeofenceMode] = useState(false);
  const [geofenceCenter, setGeofenceCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(300);
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean | null>(null);
  const [geofencePoints, setGeofencePoints] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [geofencePath, setGeofencePath] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [savedGeofence, setSavedGeofence] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const [petName, setPetName] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>("GPS Tracker");

  const insets = useSafeAreaInsets();

  /* ================= LOAD PET MATCH ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceCode) {
      setPetName(null);
      setPetPhotoURL(null);
      return;
    }

    const ref = doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceCode);

    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setPetName(null);
        setPetPhotoURL(null);
        return;
      }

      const data = snap.data();
      setPetName(data.petName ?? null);
      setPetPhotoURL(data.photoURL ?? null);

      setPetMarkerKey((k) => k + 1);
      setMarkerReady(false);
    });
  }, [deviceCode]);

  useEffect(() => {
    if (!auth.currentUser || !deviceCode) return;

    const gfRef = doc(db, "users", auth.currentUser.uid, "geofences", deviceCode);

    return onSnapshot(gfRef, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const pts = data?.points;

      if (Array.isArray(pts) && pts.length >= 3) {
        setSavedGeofence(
          pts.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }))
        );
      }
    });
  }, [deviceCode]);

  useEffect(() => {
    if (deviceCode) return;

    // ✅ clear map UI when no active device
    setIsTracking(false);

    setLocation(null);
    setPetLocation(null);

    setRawPath([]);
    setDisplayPath([]);
    setAccumulatedDistance(0);

    setPetName(null);
    setPetPhotoURL(null);

    setSavedGeofence(null);
    setGeofencePoints([]);
    setGeofencePath([]);
    setIsGeofenceMode(false);
    setIsInsideGeofence(null);
    setGeofenceCenter(null);
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
          setDeviceName("GPS Tracker");

          setIsTracking(false);
          setLocation(null);
          setPetLocation(null);
          setRawPath([]);
          setDisplayPath([]);
          setAccumulatedDistance(0);
          setSavedGeofence(null);

          return;
        }
        setDeviceCode(active);
        const stored = await AsyncStorage.getItem("devices");
        const list: Device[] = stored ? JSON.parse(stored) : [];
        const device = list.find((d) => d.code === active);

        if (device?.type && DEVICE_TYPES[device.type]) {
          setDeviceName(DEVICE_TYPES[device.type].name);
        } else {
          setDeviceName("GPS Tracker");
        }
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

    const newDevice = {
      code,
      type: "GPS_TRACKER_A7670",
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
      Alert.alert("ยกเลิกการตั้งค่า", "ข้อมูลที่กำหนดไว้จะหายไป", [
        { text: "ไม่ยกเลิก", style: "cancel" },
        {
          text: "ยกเลิก",
          style: "destructive",
          onPress: () => {
            setGeofencePoints([]);
            setIsGeofenceMode(false);
          },
        },
      ]);
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

    await push(dbRef(rtdb, `devices/${deviceCode}/alerts`), {
      type,
      message,
      atUtc,
      atTh,
      radiusKm: geofenceRadius / 1000,
      device: deviceCode,
    });
  };

  const saveGeofence = async () => {
    if (geofencePoints.length < 3) {
      Alert.alert("ต้องมีอย่างน้อย 3 จุด");
      return;
    }

    const polygon = [...geofencePoints];

    // ✅ วาด Polygon ให้ทันที (ไม่ต้องรอ auth/deviceCode)
    setSavedGeofence(polygon);

    // ✅ ออกจากโหมดวาด
    setIsInsideGeofence(null);
    setIsGeofenceMode(false);
    setGeofencePoints([]);
    setGeofencePath([]);

  };

  /* ================= ROUTE MODAL (Today default + Custom + Cross-day + Single Picker) ================= */
  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 0, 0);

    return { start, end };
  };

  const [{ routeFrom, routeTo }, setRouteRange] = useState(() => {
    const { start, end } = getTodayRange();
    return { routeFrom: start, routeTo: end };
  });

  // ✅ picker ตัวเดียว
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("time");
  const [activeField, setActiveField] = useState<
    "fromDate" | "fromTime" | "toDate" | "toTime"
  >("fromTime");

  const openPicker = (field: "fromDate" | "fromTime" | "toDate" | "toTime") => {
    setActiveField(field);
    setPickerMode(field.includes("Date") ? "date" : "time");
    setPickerVisible(true);
  };

  // เปิด modal => reset เป็น "วันนี้"
  const openRouteModal = () => {
    const { start, end } = getTodayRange();
    setRoutePreset("today");
    setRouteRange({ routeFrom: start, routeTo: end });
    setRouteModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={onMapPress}
      >
        {/* ✅ SAVED GEOFENCE (FILLED) */}
        {savedGeofence && savedGeofence.length >= 3 && (
          <Polygon
            coordinates={savedGeofence}
            strokeColor="#A100CE"
            strokeWidth={3}
            fillColor="rgba(150, 23, 185, 0.21)"
            zIndex={1}
          />
        )}

        {/* drawing geofence */}
        {isGeofenceMode && geofencePoints.length > 1 && (
          <Polyline
            coordinates={geofencePoints}
            strokeColor="#A100CE"
            strokeWidth={3}
            lineDashPattern={[8, 6]}
            zIndex={4}
          />
        )}

        {/* path tracking */}
        {displayPath.length > 1 && (
          <Polyline
            coordinates={displayPath}
            strokeColor="#875100"
            strokeWidth={8}
            zIndex={3}
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
                color="#8F08B5"
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
              <View style={styles.petMarker} onLayout={() => setMarkerReady(true)}>
                <Image
                  source={{ uri: petPhotoURL }}
                  style={styles.petImage}
                  onLoadEnd={() => setMarkerReady(true)}
                />
              </View>
            ) : (
              <View style={styles.pawMarker} onLayout={() => setMarkerReady(true)}>
                <MaterialIcons name="pets" size={26} color="#7A4A00" />
              </View>
            )}

            <Callout tooltip>
              <View style={styles.calloutWrapper}>
                <View style={styles.calloutHandle} />
                <View style={styles.calloutCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{petName ?? "สัตว์เลี้ยง"}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{deviceName}</Text>
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

      {/* ===== MENU / FILTER BOTTOM SHEET ===== */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />

          <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>ตัวกรองแผนที่</Text>

            {/* ✅ รายการ 1: Geofence */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);
                setIsGeofenceMode(true);
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialCommunityIcons
                  name="border-style"
                  size={22}
                  color="#905b0d"
                />
              </View>
              <Text style={styles.sheetText}>กำหนดพื้นที่ (Geofence)</Text>
              <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            {/* ✅ รายการ 2: Add device */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);
                setModalVisible(true);
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialIcons
                  name="add-circle-outline"
                  size={24}
                  color="#905b0d"
                />
              </View>
              <Text style={styles.sheetText}>เพิ่มอุปกรณ์</Text>
              <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            {/* ✅ รายการ 3: บันทึกเส้นทางย้อนหลัง */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);
                openRouteModal();
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialCommunityIcons
                  name="map-clock-outline"
                  size={24}
                  color="#905b0d"
                />
              </View>
              <Text style={styles.sheetText}>บันทึกเส้นทาง</Text>
              <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== ROUTE SAVE MODAL (TODAY DEFAULT + CUSTOM + CROSS DAY) ===== */}
      <Modal visible={routeModalVisible} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setRouteModalVisible(false)}
          />

          <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>บันทึกเส้นทาง</Text>

            {/* ✅ เลือก "วันนี้" / "กำหนดเอง" */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  routePreset === "today" && styles.presetChipActive,
                ]}
                onPress={() => {
                  const { start, end } = getTodayRange();
                  setRoutePreset("today");
                  setRouteRange({ routeFrom: start, routeTo: end });
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    routePreset === "today" && styles.presetChipTextActive,
                  ]}
                >
                  วันนี้
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  routePreset === "custom" && styles.presetChipActive,
                ]}
                onPress={() => setRoutePreset("custom")}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    routePreset === "custom" && styles.presetChipTextActive,
                  ]}
                >
                  กำหนดเอง
                </Text>
              </TouchableOpacity>
            </View>

            {/* FROM / TO (รองรับข้ามวัน) */}
            <View style={styles.timeRow}>
              {/* FROM */}
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>FROM (วัน)</Text>
                <TouchableOpacity
                  style={styles.timeBox}
                  onPress={() => openPicker("fromDate")}
                >
                  <Text style={styles.timeValue}>
                    {routeFrom.toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <Text style={styles.timeLabel}>FROM (เวลา)</Text>
                <TouchableOpacity
                  style={styles.timeBox}
                  onPress={() => openPicker("fromTime")}
                >
                  <Text style={styles.timeValue}>
                    <Text style={styles.timeValue}>
                      {routeFrom.toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}{" "}
                      น.
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ width: 12 }} />

              {/* TO */}
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>TO (วัน)</Text>
                <TouchableOpacity
                  style={styles.timeBox}
                  onPress={() => openPicker("toDate")}
                >
                  <Text style={styles.timeValue}>
                    {routeTo.toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <Text style={styles.timeLabel}>TO (เวลา)</Text>
                <TouchableOpacity
                  style={styles.timeBox}
                  onPress={() => openPicker("toTime")}
                >
                  <Text style={styles.timeValue}>
                    {routeTo.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}{" "}
                    น.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ✅ DateTimePicker ตัวเดียว */}
            {pickerVisible && (
              <DateTimePicker
                value={
                  activeField === "fromDate" || activeField === "fromTime"
                    ? routeFrom
                    : routeTo
                }
                mode={pickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, selected) => {
                  // Android: ปิดเมื่อเลือก/ยกเลิก
                  if (Platform.OS !== "ios") setPickerVisible(false);
                  if (!selected) return;

                  const applyDate = (base: Date, picked: Date) => {
                    const next = new Date(base);
                    next.setFullYear(
                      picked.getFullYear(),
                      picked.getMonth(),
                      picked.getDate()
                    );
                    return next;
                  };

                  const applyTime = (base: Date, picked: Date) => {
                    const next = new Date(base);
                    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
                    return next;
                  };

                  let nextFrom = routeFrom;
                  let nextTo = routeTo;

                  if (activeField === "fromDate") nextFrom = applyDate(routeFrom, selected);
                  if (activeField === "fromTime") nextFrom = applyTime(routeFrom, selected);

                  if (activeField === "toDate") nextTo = applyDate(routeTo, selected);
                  if (activeField === "toTime") nextTo = applyTime(routeTo, selected);

                  // ✅ รองรับข้ามวัน แต่ TO ต้อง "หลัง" FROM เสมอ
                  if (nextTo.getTime() <= nextFrom.getTime()) {
                    Alert.alert(
                      "ช่วงเวลาไม่ถูกต้อง",
                      "เวลา TO ต้องมากกว่า FROM (สามารถข้ามวันได้ แต่ TO ต้องหลัง FROM)"
                    );
                    return;
                  }

                  setRouteRange({ routeFrom: nextFrom, routeTo: nextTo });

                  // ผู้ใช้เริ่มปรับเอง => custom
                  if (routePreset !== "custom") setRoutePreset("custom");
                }}
              />
            )}

            {/* Continue */}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => {
                setRouteModalVisible(false);
                Alert.alert(
                  "บันทึกเส้นทาง",
                  `ช่วงเวลา:\n${routeFrom.toLocaleString("th-TH", { hour12: false })} \n ถึง ${routeTo.toLocaleString("th-TH",
                    { hour12: false })}`
                );
              }}
            >
              <Text style={styles.continueText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isGeofenceMode && (
        <View
          style={[
            styles.geoBottomSheet,
            {
              bottom: 16 + insets.bottom + 56,
            },
          ]}
        >
          <Text style={styles.geoTitle}>กำหนดพื้นที่ Geofence</Text>

          <Text style={styles.geoSubtitle}>
            {geofencePoints.length} จุด · แตะบนแผนที่
          </Text>

          <View style={styles.geoActionRow}>
            {/* ยกเลิก */}
            <TouchableOpacity
              style={[styles.geoBtn, styles.geoCancel]}
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
              onPress={saveGeofence}
            >
              <Text style={styles.geoSaveText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== TOP RIGHT CONTROLS ===== */}
      <View style={[styles.topRightControls, { top: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.topFab, { backgroundColor: "#FFFFFF" }]}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="tune" size={24} color="#111827" />
        </TouchableOpacity>

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
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  topRightControls: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    gap: 12,
    zIndex: 30,
  },

  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  sheetText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },

  presetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },

  presetChipActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#905b0d",
  },

  presetChipText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#374151",
  },

  presetChipTextActive: {
    color: "#905b0d",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  timeLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "800",
    marginBottom: 6,
  },

  timeBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },

  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  routeHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
    fontWeight: "700",
  },

  continueBtn: {
    backgroundColor: "#905b0dff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  continueText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
});