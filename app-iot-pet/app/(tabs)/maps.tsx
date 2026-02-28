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
  DeviceEventEmitter,
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
import { auth, db, rtdb } from "../../firebase/firebase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ref as dbRef, push } from "firebase/database";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";

/* ================= CONFIG ================= */
const BACKEND_URL = "http://localhost:3000";
const MIN_MOVE_DISTANCE = 5;

/* ✅ storage keys */
const ROUTE_FILTER_STORAGE_KEY = "routeFilter_v1";
const ACTIVE_GEOFENCE_STORAGE_KEY = "activeGeofence_v1";
const ROUTE_RECORDING_ENDED_EVENT = "routeRecordingEnded";

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

type GeoPoint = { latitude: number; longitude: number };

/* ================= HAVERSINE ================= */
function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapTracker() {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const [displayPath, setDisplayPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [accumulatedDistance, setAccumulatedDistance] = useState(0);

  const [petPhotoURL, setPetPhotoURL] = useState<string | null>(null);
  const [petName, setPetName] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);

  const petMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const [restorePetCallout, setRestorePetCallout] = useState(false);
  const [petLocation, setPetLocation] = useState<DeviceLocation | null>(null);
  const [markerReady, setMarkerReady] = useState(false);
  const [petMarkerKey, setPetMarkerKey] = useState(0);

  const [menuVisible, setMenuVisible] = useState(false);

  /* ================= ROUTE MODAL STATE ================= */
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routePreset, setRoutePreset] = useState<"today" | "custom">("today");
  const [savedRouteFilter, setSavedRouteFilter] = useState<{ from: Date; to: Date } | null>(null);

  /* ================= GEOFENCE ================= */
  const [isGeofenceMode, setIsGeofenceMode] = useState(false);
  const [geofenceCenter, setGeofenceCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(300);
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean | null>(null);

  const [geofencePoints, setGeofencePoints] = useState<GeoPoint[]>([]);
  const [geofencePath, setGeofencePath] = useState<GeoPoint[]>([]);

  const [storedGeofence, setStoredGeofence] = useState<GeoPoint[] | null>(null);
  const [activeGeofence, setActiveGeofence] = useState<GeoPoint[] | null>(null);
  const [activeGeofenceUntil, setActiveGeofenceUntil] = useState<Date | null>(null);

  const [deviceName, setDeviceName] = useState<string>("GPS Tracker");

  /* ================= RECORDING ================= */
  const [isRecording, setIsRecording] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // ✅ Callout recording UI state
  const [calloutRecordingInfo, setCalloutRecordingInfo] = useState<{
    savedAtIso: string;
    fromIso: string;
    toIso: string;
  } | null>(null);

  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordingCtxRef = useRef<{ deviceCode: string; petId: string; recordId: string } | null>(null);

  // metrics refs for current recording
  const recordingStartMsRef = useRef<number | null>(null);
  const geofenceExitCountRef = useRef<number>(0);

  /* ================= HELPERS / REFS ================= */
  const normalizeGeo = (poly: GeoPoint[] | null | undefined) => {
    if (!poly || !Array.isArray(poly) || poly.length < 3) return null;
    return poly.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
  };

  const MAX_ACCEPT_ACCURACY = 50;
  const MAX_PLAUSIBLE_SPEED = 8;

  const lastAcceptedRef = useRef<{ lat: number; lng: number; tsMs: number } | null>(null);
  const prevInsideRef = useRef<boolean | null>(null);
  const lastMetricsPushRef = useRef<number>(0);

  const isCalloutRecording = !!calloutRecordingInfo || isRecording;
  // const calloutSavedAtIso = calloutRecordingInfo?.savedAtIso ?? null;

  const clearActiveGeofence = useCallback(async () => {
    setActiveGeofence(null);
    setActiveGeofenceUntil(null);
    try {
      await AsyncStorage.removeItem(ACTIVE_GEOFENCE_STORAGE_KEY);
    } catch { }
  }, []);

  const resetAfterRecordingEnd = useCallback(async () => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    setIsRecording(false);
    setIsTracking(false);
    setRecordId(null);
    recordingCtxRef.current = null;

    setCalloutRecordingInfo(null);
    setRestorePetCallout(false);

    await clearActiveGeofence();
    setSavedRouteFilter(null);
    await AsyncStorage.removeItem(ROUTE_FILTER_STORAGE_KEY);

    await clearActiveGeofence();

    setSavedRouteFilter(null);
    try {
      await AsyncStorage.removeItem(ROUTE_FILTER_STORAGE_KEY);
    } catch { }
  }, [clearActiveGeofence]);

  const persistActiveGeofence = useCallback(
    async (payload: { deviceCode: string; geofence: GeoPoint[]; untilIso?: string | null }) => {
      try {
        await AsyncStorage.setItem(ACTIVE_GEOFENCE_STORAGE_KEY, JSON.stringify(payload));
      } catch { }
    },
    []
  );

  /* ================= PURE UTILS ================= */
  function isPointInPolygon(pt: GeoPoint, poly: GeoPoint[]) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].latitude;
      const yi = poly[i].longitude;
      const xj = poly[j].latitude;
      const yj = poly[j].longitude;

      const intersect =
        (yi > pt.longitude) !== (yj > pt.longitude) &&
        pt.latitude < ((xj - xi) * (pt.longitude - yi)) / ((yj - yi) || 1e-12) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  const sendGeofenceAlert = useCallback(
    async (type: "exit" | "enter", distance: number) => {
      if (!deviceCode) return;

      const now = new Date();
      const atUtc = now.toISOString();
      const atTh = now.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "medium" });

      const message =
        type === "exit" ? `สัตว์เลี้ยงออกนอกพื้นที่ (${Math.round(distance)} ม.)` : `สัตว์เลี้ยงกลับเข้าพื้นที่`;

      await push(dbRef(rtdb, `devices/${deviceCode}/alerts`), {
        type,
        message,
        atUtc,
        atTh,
        radiusKm: geofenceRadius / 1000,
        device: deviceCode,
      });
    },
    [deviceCode, geofenceRadius]
  );

  /* ================= FORMAT ================= */
  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatThaiDateShort = (d: Date) =>
    d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const formatThaiTimeShort = (d: Date) =>
    d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });

  /* ================= PATH ================= */
  const appendPoint = (point: TrackPoint, minMove: number = MIN_MOVE_DISTANCE) => {
    setRawPath((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = distanceInMeters(last.latitude, last.longitude, point.latitude, point.longitude);
        if (dist >= minMove) setAccumulatedDistance((d) => d + dist);
        else return prev;
      }
      return [...prev, point];
    });

    setDisplayPath((prev) => {
      if (prev.length === 0) return [{ latitude: point.latitude, longitude: point.longitude }];
      const last = prev[prev.length - 1];
      const dist = distanceInMeters(last.latitude, last.longitude, point.latitude, point.longitude);
      if (dist < minMove) return prev;
      return [...prev, { latitude: point.latitude, longitude: point.longitude }];
    });
  };

  /* ================= SAVE POINT / METRICS ================= */
  const savePoint = async (rid: string, point: TrackPoint) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const tsMs = Date.parse(point.timestamp);
    await addDoc(collection(db, "users", uid, "routeHistories", rid, "points"), {
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: point.timestamp,
      timestampMs: Number.isFinite(tsMs) ? tsMs : Date.now(),
      createdAt: serverTimestamp(),
    });
  };

  const pushMetrics = async (rid: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const startMs = recordingStartMsRef.current;
    const durationSeconds = startMs && Date.now() > startMs ? Math.round((Date.now() - startMs) / 1000) : 0;

    try {
      await updateDoc(doc(db, "users", uid, "routeHistories", rid), {
        distanceMeters: Number(accumulatedDistance.toFixed(1)),
        durationSeconds,
        exitCount: geofenceExitCountRef.current ?? 0,
        lastLiveAt: serverTimestamp(),
      });
    } catch { }
  };

  const geoInstruction =
    geofencePoints.length === 0
      ? "แตะบนแผนที่เพื่อเพิ่มจุด"
      : geofencePoints.length < 3
        ? "เพิ่มจุดให้ครบอย่างน้อย 3 จุด"
        : "ลากจุดเพื่อปรับตำแหน่ง หรือบันทึก";

  /* ================= FETCH ================= */
  const fetchLocation = async (code: string, options?: { silent?: boolean }): Promise<boolean> => {
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

      // ===== FILTER JITTER =====
      const tsMs = Date.parse(timestamp) || Date.now();
      const acc = Number(current.accuracy ?? 999);
      if (acc > MAX_ACCEPT_ACCURACY) return true;

      const prev = lastAcceptedRef.current;
      let dynamicMin = Math.max(MIN_MOVE_DISTANCE, acc * 0.6);

      if (prev) {
        const dt = Math.max(1, (tsMs - prev.tsMs) / 1000);
        const dist = distanceInMeters(prev.lat, prev.lng, current.latitude, current.longitude);
        const speed = dist / dt;
        if (speed > MAX_PLAUSIBLE_SPEED) return true;
        if (dist < dynamicMin) return true;
      }

      lastAcceptedRef.current = { lat: current.latitude, lng: current.longitude, tsMs };

      const p: TrackPoint = { latitude: current.latitude, longitude: current.longitude, timestamp };
      appendPoint(p, dynamicMin);

      // ===== GEOFENCE CHECK =====
      if (activeGeofence && activeGeofence.length >= 3) {
        const inside = isPointInPolygon(
          { latitude: current.latitude, longitude: current.longitude },
          activeGeofence
        );

        const prevInside = prevInsideRef.current;

        if (prevInside === true && !inside) {
          void sendGeofenceAlert("exit", 0);
          if (isRecording) geofenceExitCountRef.current += 1;
        }

        if (prevInside === false && inside) {
          void sendGeofenceAlert("enter", 0);
        }

        prevInsideRef.current = inside;
        setIsInsideGeofence(inside);
      }

      // ===== SAVE POINT + METRICS =====
      if (isRecording) {
        const locked = recordingCtxRef.current;
        if (!locked || locked.deviceCode !== code) return true;

        void savePoint(locked.recordId, p);

        const now = Date.now();
        if (now - lastMetricsPushRef.current >= 10000) {
          lastMetricsPushRef.current = now;
          void pushMetrics(locked.recordId);
        }
      }

      return true;
    } catch {
      if (!options?.silent) Alert.alert("ไม่พบอุปกรณ์", "กรุณาตรวจสอบรหัสอุปกรณ์");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO TRACK (ONLY WHEN RECORDING) ================= */
  useEffect(() => {
    if (!isTracking || !isRecording) return;
    const locked = recordingCtxRef.current;
    if (!locked) return;

    const timer = setInterval(() => {
      void fetchLocation(locked.deviceCode, { silent: true });
    }, 5000);

    return () => clearInterval(timer);
  }, [isTracking, isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================= RECORDING CONTROL ================= */
  const stopRecording = async (finalStatus: "completed" | "cancelled") => {
    const locked = recordingCtxRef.current;
    const rid = locked?.recordId ?? recordId;

    if (locked?.deviceCode) {
      try {
        await fetchLocation(locked.deviceCode, { silent: true });
      } catch { }
    }

    if (!auth.currentUser || !rid) {
      setIsRecording(false);
      setIsTracking(false);
      setRecordId(null);
      recordingCtxRef.current = null;
      return;
    }

    const uid = auth.currentUser.uid;

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    setIsRecording(false);
    setIsTracking(false);
    setRecordId(null);
    recordingCtxRef.current = null;

    try {
      const startMs = recordingStartMsRef.current;
      const durationSeconds = startMs && Date.now() > startMs ? Math.round((Date.now() - startMs) / 1000) : 0;
      const exitCount = geofenceExitCountRef.current ?? 0;

      await updateDoc(doc(db, "users", uid, "routeHistories", rid), {
        status: finalStatus,
        endedAt: serverTimestamp(),
        endedAtIso: new Date().toISOString(),
        distanceMeters: Number(accumulatedDistance.toFixed(1)),
        durationSeconds,
        exitCount,
      });

      recordingStartMsRef.current = null;
      geofenceExitCountRef.current = 0;
    } catch { }

    if (finalStatus === "completed" || finalStatus === "cancelled") {
      await clearActiveGeofence();
      setSavedRouteFilter(null);
      try {
        await AsyncStorage.removeItem(ROUTE_FILTER_STORAGE_KEY);
      } catch { }
    }
  };

  const startRecording = async (startAt: Date, stopAt: Date) => {
    if (!auth.currentUser) return Alert.alert("กรุณาเข้าสู่ระบบ");
    if (!deviceCode) return Alert.alert("กรุณาเลือกอุปกรณ์");
    if (!petName || !petId) return Alert.alert("ยังไม่ได้ผูกสัตว์เลี้ยงกับอุปกรณ์");

    const uid = auth.currentUser.uid;

    setRawPath([]);
    setDisplayPath([]);
    setAccumulatedDistance(0);

    lastAcceptedRef.current = null;
    prevInsideRef.current = null;
    setIsInsideGeofence(null);
    lastMetricsPushRef.current = 0;

    const geoSnapshot = normalizeGeo(activeGeofence);

    const ref = await addDoc(collection(db, "users", uid, "routeHistories"), {
      deviceCode,
      petId,
      petName,
      photoURL: petPhotoURL ?? null,
      from: startAt.toISOString(),
      to: stopAt.toISOString(),
      geofence: geoSnapshot ?? null,
      status: "recording",
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      startedAtIso: new Date().toISOString(),
      distanceMeters: 0,
      durationSeconds: 0,
      exitCount: 0,
    });

    setRecordId(ref.id);
    setIsRecording(true);
    setIsTracking(true);

    recordingCtxRef.current = { deviceCode, petId, recordId: ref.id };

    const msToStop = stopAt.getTime() - Date.now();
    if (msToStop > 0) {
      stopTimeoutRef.current = setTimeout(() => void stopRecording("completed"), msToStop);
    } else {
      void stopRecording("completed");
    }

    recordingStartMsRef.current = Date.now();
    geofenceExitCountRef.current = 0;
  };

  /* ================= MAP PRESS (GEOFENCE) ================= */
  const onMapPress = (e: MapPressEvent) => {
    if (!isGeofenceMode) return;
    const coord = e.nativeEvent.coordinate;
    if (!coord) return;
    setGeofencePoints((prev) => [...prev, { ...coord }]);
  };

  const undoGeofencePoint = () => {
    setGeofencePoints((prev) => (prev.length === 0 ? prev : prev.slice(0, prev.length - 1)));
    setIsInsideGeofence(null);
  };

  /* ================= LOAD PET MATCH ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceCode) {
      setPetName(null);
      setPetPhotoURL(null);
      setPetId(null);
      return;
    }

    const ref = doc(db, "users", auth.currentUser.uid, "deviceMatches", deviceCode);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setPetName(null);
        setPetPhotoURL(null);
        setPetId(null);
        return;
      }
      const data: any = snap.data();
      setPetName(data.petName ?? null);
      setPetPhotoURL(data.photoURL ?? null);
      setPetId(data.petId ?? null);

      setPetMarkerKey((k) => k + 1);
      setMarkerReady(false);
    });
  }, [deviceCode]);

  /* ================= LOAD GEOFENCE (stored only) ================= */
  useEffect(() => {
    if (!auth.currentUser || !deviceCode) return;
    const gfRef = doc(db, "users", auth.currentUser.uid, "geofences", deviceCode);

    return onSnapshot(gfRef, (snap) => {
      if (!snap.exists()) {
        setStoredGeofence(null);
        return;
      }
      const data: any = snap.data();
      const pts = data?.points;

      if (Array.isArray(pts) && pts.length >= 3) {
        const polygon = pts.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }));
        setStoredGeofence(normalizeGeo(polygon));
      } else {
        setStoredGeofence(null);
      }
    });
  }, [deviceCode]);

  /* ✅ load previously saved filter (time) */
  useEffect(() => {
    const loadFilter = async () => {
      try {
        const raw = await AsyncStorage.getItem(ROUTE_FILTER_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.from && parsed?.to) {
          const from = new Date(parsed.from);
          const to = new Date(parsed.to);
          if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) setSavedRouteFilter({ from, to });
        }
      } catch { }
    };
    void loadFilter();
  }, []);

  /* ✅ load active geofence (ค้างไว้) */
  useEffect(() => {
    const loadActiveGeo = async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_GEOFENCE_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!parsed?.geofence) return;

        if (parsed.deviceCode && deviceCode && parsed.deviceCode !== deviceCode) return;

        const geo = normalizeGeo(parsed.geofence);
        if (!geo) return;

        if (parsed.untilIso) {
          const until = new Date(parsed.untilIso);
          if (Number.isNaN(until.getTime())) return;

          if (until.getTime() <= Date.now()) {
            await AsyncStorage.removeItem(ACTIVE_GEOFENCE_STORAGE_KEY);
            return;
          }
          setActiveGeofenceUntil(until);
        } else {
          setActiveGeofenceUntil(null);
        }

        setActiveGeofence(geo);
      } catch { }
    };

    void loadActiveGeo();
  }, [deviceCode]);

  /* ✅ auto clear active geofence when expired */
  useEffect(() => {
    if (!activeGeofenceUntil) return;
    const timer = setInterval(() => {
      if (activeGeofenceUntil.getTime() <= Date.now()) void clearActiveGeofence();
    }, 30000);
    return () => clearInterval(timer);
  }, [activeGeofenceUntil, clearActiveGeofence]);

  /* ================= RESET WHEN NO DEVICE ================= */
  useEffect(() => {
    if (deviceCode) return;

    if (isRecording) void stopRecording("cancelled");

    setIsTracking(false);
    setLocation(null);
    setPetLocation(null);
    setRawPath([]);
    setDisplayPath([]);
    setAccumulatedDistance(0);
    setPetName(null);
    setPetPhotoURL(null);
    setPetId(null);

    setGeofencePoints([]);
    setGeofencePath([]);
    setIsGeofenceMode(false);
    setIsInsideGeofence(null);
    setGeofenceCenter(null);

    setStoredGeofence(null);
    setActiveGeofence(null);
    setActiveGeofenceUntil(null);
  }, [deviceCode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================= CLEANUP TIMERS ON UNMOUNT ================= */
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
  }, []);

  /* ================= BLOCK SWITCH DEVICE WHILE RECORDING ================= */
  useEffect(() => {
    if (!isRecording) return;
    const locked = recordingCtxRef.current;
    if (!locked) return;

    if (deviceCode && deviceCode !== locked.deviceCode) {
      Alert.alert("กำลังบันทึกเส้นทางอยู่", "ไม่สามารถสลับอุปกรณ์ระหว่างบันทึกได้ ระบบจะยกเลิกการบันทึกปัจจุบัน");
      void stopRecording("cancelled");
    }
  }, [deviceCode, isRecording]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      ROUTE_RECORDING_ENDED_EVENT,
      (payload?: { routeId?: string; deviceCode?: string | null }) => {
        if (payload?.deviceCode && deviceCode && payload.deviceCode !== deviceCode) return;

        // ✅ reset สถานะกำลังติดตาม/กำลังบันทึกทั้งหมด
        void resetAfterRecordingEnd();

        petMarkerRef.current?.hideCallout?.();
      }
    );

    return () => sub.remove();
  }, [deviceCode, resetAfterRecordingEnd]);

  useEffect(() => {
    if (!auth.currentUser) return;
    if (!recordId) return;

    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "routeHistories", recordId);

    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data: any = snap.data();
      const s = (data?.status ?? "").toString().toLowerCase();
      if (s && s !== "recording" && s !== "running" && s !== "in_progress") void resetAfterRecordingEnd();
    });
  }, [recordId, resetAfterRecordingEnd]);

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
          return;
        }

        setDeviceCode(active);

        const stored = await AsyncStorage.getItem("devices");
        const list: Device[] = stored ? JSON.parse(stored) : [];
        const device = list.find((d) => d.code === active);

        if (device?.type && DEVICE_TYPES[device.type]) setDeviceName(DEVICE_TYPES[device.type].name);
        else setDeviceName("GPS Tracker");

        setIsTracking(false);
      };

      void load();
    }, [])
  );

  useEffect(() => {
    if (geofencePoints.length >= 2) setGeofencePath([...geofencePoints]);
    else setGeofencePath([]);
  }, [geofencePoints]);

  useEffect(() => {
    if (!restorePetCallout || !petLocation) return;
    setTimeout(() => {
      petMarkerRef.current?.showCallout();
      setRestorePetCallout(false);
    }, 300);
  }, [restorePetCallout, petLocation]);

  useEffect(() => {
    if (!savedRouteFilter?.to) return;

    const t = setInterval(async () => {
      const toMs = savedRouteFilter.to.getTime();
      if (toMs <= Date.now()) {
        setSavedRouteFilter(null);
        try {
          await AsyncStorage.removeItem(ROUTE_FILTER_STORAGE_KEY);
        } catch { }
        await clearActiveGeofence();
      }
    }, 30000);

    return () => clearInterval(t);
  }, [savedRouteFilter, clearActiveGeofence]);

  /* ================= ADD DEVICE ================= */
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

    lastAcceptedRef.current = null;
    prevInsideRef.current = null;
    setIsInsideGeofence(null);
    lastMetricsPushRef.current = 0;

    setIsTracking(true);
    setModalVisible(false);
    setTempCode("");
  };

  /* ================= GEOFENCE ACTIONS ================= */
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

  const saveGeofence = async () => {
    if (geofencePoints.length < 3) return Alert.alert("ต้องมีอย่างน้อย 3 จุด");
    if (!auth.currentUser) return Alert.alert("กรุณาเข้าสู่ระบบ");
    if (!deviceCode) return Alert.alert("กรุณาเลือกอุปกรณ์ก่อน");

    const polygon = normalizeGeo([...geofencePoints]);
    if (!polygon || polygon.length < 3) return Alert.alert("Geofence ไม่ถูกต้อง", "กรุณาลองกำหนดจุดใหม่");

    // 1) เก็บลง stored
    setStoredGeofence(polygon);

    // 2) active
    setActiveGeofence(polygon);

    await persistActiveGeofence({
      deviceCode,
      geofence: polygon,
      untilIso: savedRouteFilter?.to ? savedRouteFilter.to.toISOString() : null,
    });

    if (savedRouteFilter?.to) {
      const until = savedRouteFilter.to;
      if (until.getTime() > Date.now()) setActiveGeofenceUntil(until);
      else {
        await clearActiveGeofence();
        setActiveGeofenceUntil(null);
      }
    } else {
      setActiveGeofenceUntil(null);
    }

    // 3) บันทึกลง Firestore
    try {
      const uid = auth.currentUser.uid;
      await setDoc(
        doc(db, "users", uid, "geofences", deviceCode),
        { deviceCode, points: polygon, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {
      Alert.alert("บันทึก Geofence ไม่สำเร็จ", "ลองใหม่อีกครั้ง");
      return;
    }

    // 4) ถ้ามีเวลา -> ค้างถึง TO และ persist
    if (savedRouteFilter?.to) {
      const until = savedRouteFilter.to;
      if (until.getTime() > Date.now()) {
        setActiveGeofenceUntil(until);
        await persistActiveGeofence({ deviceCode, geofence: polygon, untilIso: until.toISOString() });
      } else {
        await clearActiveGeofence();
        setActiveGeofenceUntil(null);
      }
    }

    // reset drawing
    setIsInsideGeofence(null);
    setIsGeofenceMode(false);
    setGeofencePoints([]);
    setGeofencePath([]);

    setTimeout(() => setMenuVisible(true), 250);
  };

  /* ================= ROUTE MODAL ================= */
  const getTodayRange = () => {
    const now = new Date();

    // ✅ start = เวลาปัจจุบัน (ปัดวินาที/มิลลิวินาทีทิ้ง)
    const start = new Date(now);
    start.setSeconds(0, 0);

    // ✅ end = 23:59 ของวันนี้
    const end = new Date(now);
    end.setHours(23, 59, 0, 0);

    return { start, end };
  };

  const [{ routeFrom, routeTo }, setRouteRange] = useState(() => {
    const { start, end } = getTodayRange();
    return { routeFrom: start, routeTo: end };
  });

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("time");
  const [activeField, setActiveField] = useState<"fromDate" | "fromTime" | "toDate" | "toTime">("fromTime");

  const openPicker = (field: "fromDate" | "fromTime" | "toDate" | "toTime") => {
    setActiveField(field);
    setPickerMode(field.includes("Date") ? "date" : "time");
    setPickerVisible(true);
  };

  const openRouteModal = () => {
    if (savedRouteFilter) {
      setRoutePreset("custom");
      setRouteRange({ routeFrom: savedRouteFilter.from, routeTo: savedRouteFilter.to });
      setRouteModalVisible(true);
      return;
    }
    const { start, end } = getTodayRange();
    setRoutePreset("today");
    setRouteRange({ routeFrom: start, routeTo: end });
    setRouteModalVisible(true);
  };

  const saveRouteHistory = async () => {
    const startAt = routeFrom;
    const stopAt = routeTo;

    if (stopAt.getTime() <= startAt.getTime()) {
      Alert.alert("ช่วงเวลาไม่ถูกต้อง", "TO ต้องมากกว่า FROM");
      return;
    }

    setSavedRouteFilter({ from: startAt, to: stopAt });

    if (activeGeofence && activeGeofence.length >= 3) {
      if (stopAt.getTime() > Date.now()) {
        setActiveGeofenceUntil(stopAt);
        await persistActiveGeofence({
          deviceCode: deviceCode ?? "",
          geofence: activeGeofence,
          untilIso: stopAt.toISOString(),
        });
      } else {
        await clearActiveGeofence();
        setActiveGeofenceUntil(null);
      }
    }

    try {
      await AsyncStorage.setItem(
        ROUTE_FILTER_STORAGE_KEY,
        JSON.stringify({
          deviceCode,
          from: startAt.toISOString(),
          to: stopAt.toISOString(),
          hasGeofence: !!(activeGeofence && activeGeofence.length >= 3),
        })
      );
    } catch { }

    setRouteModalVisible(false);

    const { start, end } = getTodayRange();
    setRoutePreset("today");
    setRouteRange({ routeFrom: start, routeTo: end });

    setTimeout(() => setMenuVisible(true), 250);
  };

  /* ================= SAVE FILTER & GO ================= */
  const saveFilterAndGo = async () => {
    const hasDevice = !!deviceCode;
    const hasGeo = !!(activeGeofence && activeGeofence.length >= 3);
    const hasTime = !!savedRouteFilter;

    if (!hasDevice) return Alert.alert("กรุณาเพิ่ม/เลือกอุปกรณ์ก่อน");
    if (!hasGeo) return Alert.alert("กรุณากำหนด Geofence ก่อน");
    if (!hasTime) return Alert.alert("กรุณาเพิ่มเวลา (บันทึกเส้นทาง) ก่อน");
    if (!petId || !petName) return Alert.alert("ยังไม่ได้ผูกสัตว์เลี้ยง", "กรุณาเชื่อมต่ออุปกรณ์กับสัตว์เลี้ยงก่อน");
    if (isRecording) return Alert.alert("กำลังบันทึกอยู่", "กรุณารอให้การบันทึกปัจจุบันจบก่อน");

    const startAt = savedRouteFilter!.from;
    const stopAt = savedRouteFilter!.to;

    const savedAtIso = new Date().toISOString();
    setCalloutRecordingInfo({
      savedAtIso,
      fromIso: startAt.toISOString(),
      toIso: stopAt.toISOString(),
    });

    // ให้ callout เด้งขึ้นทันที
    setRestorePetCallout(true);

    if (stopAt.getTime() <= startAt.getTime()) {
      Alert.alert("ช่วงเวลาไม่ถูกต้อง", "TO ต้องมากกว่า FROM");
      return;
    }

    try {
      await AsyncStorage.setItem(
        ROUTE_FILTER_STORAGE_KEY,
        JSON.stringify({
          deviceCode,
          from: startAt.toISOString(),
          to: stopAt.toISOString(),
          hasGeofence: true,
          geofence: activeGeofence,
          savedAt: new Date().toISOString(),
        })
      );
    } catch { }

    setActiveGeofenceUntil(stopAt);
    void persistActiveGeofence({
      deviceCode: deviceCode!,
      geofence: activeGeofence!,
      untilIso: stopAt.toISOString(),
    });

    setMenuVisible(false);
    router.push("/RouteHistoryList");

    const now = Date.now();
    if (startAt.getTime() > now) {
      const msToStart = startAt.getTime() - now;

      Alert.alert("ตั้งเวลาบันทึกแล้ว", `จะเริ่มบันทึกตอน ${startAt.toLocaleString("th-TH", { hour12: false })}`);

      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = setTimeout(() => void startRecording(startAt, stopAt), msToStart);
      return;
    }

    const actualStart = new Date();
    void startRecording(actualStart, stopAt);
  };

  /* ================= UI HELPERS ================= */
  const hasDeviceSelected = !!deviceCode;
  const hasGeofenceSaved = !!(activeGeofence && activeGeofence.length >= 3);
  const hasTimeSaved = !!savedRouteFilter;
  const canSaveFilter = hasDeviceSelected && hasGeofenceSaved && hasTimeSaved;

  const renderRightStatus = (done: boolean) => {
    if (done) return <MaterialIcons name="check-circle" size={22} color="#16A34A" />;
    return <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />;
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} onPress={onMapPress}>
        {/* ✅ แสดงเฉพาะ active geofence (ไม่ใช่ stored) */}
        {activeGeofence && activeGeofence.length >= 3 && (
          <Polygon
            coordinates={activeGeofence}
            strokeColor="#A100CE"
            strokeWidth={3}
            fillColor="rgba(150, 23, 185, 0.21)"
            zIndex={1}
          />
        )}

        {/* drawing geofence */}
        {isGeofenceMode && geofencePoints.length > 1 && (
          <Polyline coordinates={geofencePoints} strokeColor="#A100CE" strokeWidth={3} lineDashPattern={[8, 6]} zIndex={4} />
        )}

        {/* path tracking */}
        {displayPath.length > 1 && <Polyline coordinates={displayPath} strokeColor="#875100" strokeWidth={8} zIndex={3} />}

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
              <MaterialIcons name="radio-button-checked" size={18} color="#8F08B5" />
            </Marker>
          );
        })}

        {petLocation && (
          <Marker
            key={`pet-marker-${petMarkerKey}`}
            ref={petMarkerRef}
            coordinate={{ latitude: petLocation.latitude, longitude: petLocation.longitude }}
            tracksViewChanges={!markerReady}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            {petPhotoURL ? (
              <View style={styles.petMarker} onLayout={() => setMarkerReady(true)}>
                <Image source={{ uri: petPhotoURL }} style={styles.petImage} onLoadEnd={() => setMarkerReady(true)} />
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

                  {/* แสดงสถานะ */}
                  {isCalloutRecording && (
                    <View style={styles.row}>
                      <Text style={styles.icon}>🟢</Text>
                      <Text style={styles.recordingText}>กำลังติดตาม</Text>
                    </View>
                  )}
                  <View style={styles.row}>
                    <Text style={styles.icon}>📅</Text>
                    <Text style={styles.text}>{formatThaiDate(petLocation.timestamp)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.icon}>🕒</Text>
                    <Text style={styles.text}>{formatThaiTime(petLocation.timestamp)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.monoText}>
                      {petLocation.latitude.toFixed(6)}, {petLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.icon}>📏</Text>
                    <Text style={styles.boldText}>{accumulatedDistance.toFixed(1)} m</Text>
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
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenuVisible(false)} />

          <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>ตัวกรองแผนที่</Text>

            {/* Add device */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);
                setModalVisible(true);
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialIcons name="add-circle-outline" size={24} color="#905b0d" />
              </View>
              <Text style={styles.sheetText}>เพิ่มอุปกรณ์</Text>
              {renderRightStatus(hasDeviceSelected)}
            </TouchableOpacity>

            {/* Geofence */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);

                setGeofencePoints([]);
                setGeofencePath([]);
                setIsInsideGeofence(null);

                setIsGeofenceMode(true);
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialCommunityIcons name="border-style" size={22} color="#905b0d" />
              </View>
              <Text style={styles.sheetText}>กำหนดพื้นที่ (Geofence)</Text>
              {renderRightStatus(hasGeofenceSaved)}
            </TouchableOpacity>

            {/* Route time */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuVisible(false);
                openRouteModal();
              }}
            >
              <View style={styles.sheetIcon}>
                <MaterialCommunityIcons name="map-clock-outline" size={24} color="#905b0d" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sheetText}>บันทึกเส้นทาง</Text>
                {savedRouteFilter && (
                  <Text style={styles.sheetSubText}>
                    {formatThaiDateShort(savedRouteFilter.from)} {formatThaiTimeShort(savedRouteFilter.from)} น. -{" "}
                    {formatThaiDateShort(savedRouteFilter.to)} {formatThaiTimeShort(savedRouteFilter.to)} น.
                  </Text>
                )}
              </View>

              {renderRightStatus(hasTimeSaved)}
            </TouchableOpacity>

            {/* Save filter */}
            <TouchableOpacity
              style={[styles.saveFilterBtn, !canSaveFilter && styles.saveFilterBtnDisabled]}
              disabled={!canSaveFilter}
              onPress={saveFilterAndGo}
            >
              <Text style={styles.saveFilterText}>บันทึกการกรอง</Text>
            </TouchableOpacity>

            {!canSaveFilter && (
              <Text style={styles.saveFilterHint}>* ต้องเพิ่มอุปกรณ์, กำหนด Geofence และเพิ่มเวลาให้ครบก่อน</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ===== ROUTE SAVE MODAL ===== */}
      <Modal visible={routeModalVisible} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRouteModalVisible(false)} />

          <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>บันทึกเส้นทาง</Text>

            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetChip, routePreset === "today" && styles.presetChipActive]}
                onPress={() => {
                  const { start, end } = getTodayRange();
                  setRoutePreset("today");
                  setRouteRange({ routeFrom: start, routeTo: end });
                }}
              >
                <Text style={[styles.presetChipText, routePreset === "today" && styles.presetChipTextActive]}>
                  วันนี้
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, routePreset === "custom" && styles.presetChipActive]}
                onPress={() => setRoutePreset("custom")}
              >
                <Text style={[styles.presetChipText, routePreset === "custom" && styles.presetChipTextActive]}>กำหนดเอง</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>FROM (วัน)</Text>
                <TouchableOpacity style={styles.timeBox} onPress={() => openPicker("fromDate")}>
                  <Text style={styles.timeValue}>
                    {routeFrom.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <Text style={styles.timeLabel}>FROM (เวลา)</Text>
                <TouchableOpacity style={styles.timeBox} onPress={() => openPicker("fromTime")}>
                  <Text style={styles.timeValue}>
                    {routeFrom.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>TO (วัน)</Text>
                <TouchableOpacity style={styles.timeBox} onPress={() => openPicker("toDate")}>
                  <Text style={styles.timeValue}>
                    {routeTo.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <Text style={styles.timeLabel}>TO (เวลา)</Text>
                <TouchableOpacity style={styles.timeBox} onPress={() => openPicker("toTime")}>
                  <Text style={styles.timeValue}>
                    {routeTo.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {pickerVisible && (
              <DateTimePicker
                value={activeField === "fromDate" || activeField === "fromTime" ? routeFrom : routeTo}
                mode={pickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, selected) => {
                  if (Platform.OS !== "ios") setPickerVisible(false);
                  if (!selected) return;

                  const applyDate = (base: Date, picked: Date) => {
                    const next = new Date(base);
                    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
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

                  if (nextTo.getTime() <= nextFrom.getTime()) {
                    Alert.alert("ช่วงเวลาไม่ถูกต้อง", "เวลา TO ต้องมากกว่า FROM (สามารถข้ามวันได้ แต่ TO ต้องหลัง FROM)");
                    return;
                  }

                  setRouteRange({ routeFrom: nextFrom, routeTo: nextTo });
                  if (routePreset !== "custom") setRoutePreset("custom");
                }}
              />
            )}

            <TouchableOpacity style={styles.continueBtn} onPress={saveRouteHistory}>
              <Text style={styles.continueText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isGeofenceMode && (
        <View style={[styles.geoBottomSheet, { bottom: 16 + insets.bottom + 56 }]}>
          <Text style={styles.geoTitle}>กำหนดพื้นที่ Geofence</Text>
          <Text style={styles.geoSubtitle}>
            {geofencePoints.length} จุด · {geoInstruction}
          </Text>

          <View style={styles.geoActionRow}>
            <TouchableOpacity style={[styles.geoBtn, styles.geoCancel]} onPress={cancelGeofence}>
              <Text style={styles.geoCancelText}>ยกเลิก</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.geoBtn, styles.geoUndo, geofencePoints.length === 0 && { opacity: 0.5 }]}
              disabled={geofencePoints.length === 0}
              onPress={undoGeofencePoint}
            >
              <Text style={styles.geoUndoText}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.geoBtn, styles.geoSave, geofencePoints.length < 3 && styles.geoSaveDisabled]}
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
        <TouchableOpacity style={[styles.topFab, { backgroundColor: "#FFFFFF" }]} onPress={() => setMenuVisible(true)}>
          <MaterialIcons name="tune" size={24} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topFab, { backgroundColor: deviceCode ? "#0b1d51" : "#aaa" }]}
          disabled={!deviceCode}
          onPress={() => {
            if (!deviceCode) return;
            setIsTracking(true);
            void fetchLocation(deviceCode);
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
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: "#aaa" }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.submitText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} disabled={loading} onPress={confirmAddDevice}>
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
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },

  sheetSubText: {
    marginTop: 4,
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  saveFilterBtn: {
    marginTop: 14,
    backgroundColor: "#905b0dff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveFilterBtnDisabled: {
    backgroundColor: "#AE9367",
  },
  saveFilterText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
  },
  saveFilterHint: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#6B7280",
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
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  recordingText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#008917",
  },
});