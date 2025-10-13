import React, { useEffect, useRef, useState } from "react";
import {Alert,Modal,StyleSheet,Text,TouchableOpacity,View,useWindowDimensions,Animated,PanResponder,} from "react-native";
import MapView, {Callout,Circle,MapPressEvent,Marker,Region} from "react-native-maps";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { rtdb } from "../../firebase/firebase";
import { ref as dbRef, onValue, push, set } from "firebase/database"; 
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEVICE_ID = "DEVICE-01";
const PAW_ICON = require("../../assets/images/pow.png");
const Home_ICON = require("../../assets/images/home.png");

type Latest =
  | {
      lat: number;
      lng: number;
      sats?: number;
      hdop?: number;
      utc?: string;
      ict?: string;
      th?: string;
      tsMs?: number;
    }
  | null;

type AlertType = "exit" | "enter"; // << เพิ่มประเภทแจ้งเตือน

const initialRegion: Region = {
  latitude: 16.475501563990804,
  longitude: 102.82504940900262,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function Map2() {
  const mapRef = useRef<MapView>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState<Region>(initialRegion);
  const [zoomLevel, setZoomLevel] = useState(0.05);
  const [followDevice, setFollowDevice] = useState(true);
  const [devicePos, setDevicePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [latest, setLatest] = useState<Latest>(null);
  const [latestThaiTime, setLatestThaiTime] = useState<string>("-");

  const [geofenceCenter, setGeofenceCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  // ---------- Refs สำหรับตรวจจับเข้า/ออกพื้นที่ + กันแจ้งซ้ำ ----------
  const prevInRef = useRef<boolean | null>(null);
  const lastAlertTsRef = useRef<number>(0);

  // ---------- Bottom Sheet setup ----------
  const SHEET_HEIGHT = Math.min(420, height * 0.6);
  const SNAP = {
    expanded: 0,
    mid: Math.max(0, SHEET_HEIGHT - 220),
    collapsed: Math.max(0, SHEET_HEIGHT - 60),
  };
  const sheetTranslateY = useRef(new Animated.Value(SNAP.collapsed)).current;
  const sheetStartY = useRef(0);

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
  const nearestSnap = (y: number) => {
    const points = [SNAP.expanded, SNAP.mid, SNAP.collapsed];
    let best = points[0];
    let bestDist = Math.abs(y - points[0]);
    for (let i = 1; i < points.length; i++) {
      const d = Math.abs(y - points[i]);
      if (d < bestDist) {
        best = points[i];
        bestDist = d;
      }
    }
    return best;
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation((val) => {
          sheetStartY.current = val ?? SNAP.collapsed;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(sheetStartY.current + g.dy, SNAP.expanded, SNAP.collapsed);
        sheetTranslateY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = sheetStartY.current + g.dy + g.vy * 120;
        const target = nearestSnap(clamp(projected, SNAP.expanded, SNAP.collapsed));
        Animated.spring(sheetTranslateY, {
          toValue: target,
          useNativeDriver: true,
          friction: 8,
          tension: 70,
        }).start();
      },
    })
  ).current;

  const toThaiTime = (utc?: string) => {
    try {
      if (!utc) return "-";
      return new Date(utc).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) || "-";
    } catch {
      if (!utc) return "-";
      const d = new Date(utc);
      d.setMinutes(d.getMinutes() + 7 * 60);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
  };

  const moveCamera = (lat: number, lng: number, zoom = zoomLevel) => {
    const newRegion: Region = {
      ...region,
      latitude: lat,
      longitude: lng,
      latitudeDelta: zoom,
      longitudeDelta: zoom,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 800);
  };

  const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const inGeofence =
    devicePos && geofenceCenter
      ? distanceMeters(devicePos, geofenceCenter) <= radiusKm * 1000
      : null;

  // ---------- subscribe ตำแหน่ง ----------
  useEffect(() => {
    const r = dbRef(rtdb, `devices/${DEVICE_ID}/latest`);
    const off = onValue(r, (snap) => {
      const v = snap.val() as Latest;
      setLatest(v);

      if (v && typeof v.lat === "number" && typeof v.lng === "number") {
        const p = { latitude: v.lat, longitude: v.lng };
        setDevicePos(p);
        setLatestThaiTime(v.th || toThaiTime(v.utc));

        if (followDevice) moveCamera(p.latitude, p.longitude);
      }
    });
    return () => off();
  }, [zoomLevel, followDevice]);

  // ---------- ฟังก์ชันบันทึกแจ้งเตือน RTDB ----------
  const addAlert = async (type: AlertType, message: string) => {
    try {
      const alertsRef = dbRef(rtdb, `devices/${DEVICE_ID}/alerts`);
      const keyRef = push(alertsRef);
      const atTh = latest?.th ?? new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
      const atUtc = latest?.utc ?? new Date().toISOString();

      await set(keyRef, {
        type,          // "exit" | "enter"
        message,       // ข้อความแจ้งเตือน
        radiusKm,      // รัศมีขณะนั้น
        device: DEVICE_ID,
        atTh,          // เวลาภาษาไทย
        atUtc,         // เวลา UTC สำรอง
      });
    } catch (e) {
      console.warn("addAlert error", e);
    }
  };

  // ---------- ตรวจจับทรานซิชันเข้า/ออกพื้นที่ ----------
  useEffect(() => {
    if (inGeofence === null) return;

    const prev = prevInRef.current;
    prevInRef.current = inGeofence;

    // รอบแรกยังไม่ต้องแจ้ง
    if (prev === null) return;

    // กันสแปม: อย่างน้อย 20 วินาทีกว่าจะส่งเตือนซ้ำ
    const now = Date.now();
    if (now - lastAlertTsRef.current < 20000) return;

    if (prev === true && inGeofence === false) {
      lastAlertTsRef.current = now;
      const msg =
        `สัตว์เลี้ยงออกนอกพื้นที่ (รัศมี ` +
        (radiusKm >= 1 ? `${radiusKm.toFixed(1)} กม.` : `${Math.round(radiusKm * 1000)} ม.`) +
        `)`;
      addAlert("exit", msg);
    } else if (prev === false && inGeofence === true) {
      lastAlertTsRef.current = now;
      addAlert("enter", "สัตว์เลี้ยงกลับเข้าพื้นที่แล้ว");
    }
  }, [inGeofence, radiusKm]); // ใช้ state ปัจจุบัน

  const handleMapPress = (e: MapPressEvent) => {
    setFollowDevice(false);
    const { coordinate } = e.nativeEvent;
    setPendingCoord({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    setModalVisible(true);
  };

  const confirmPlaceHere = () => {
    if (!pendingCoord) return;
    setGeofenceCenter(pendingCoord);
    moveCamera(pendingCoord.latitude, pendingCoord.longitude);
    setPendingCoord(null);
    setModalVisible(false);
  };

  const clearGeofence = () => setGeofenceCenter(null);

  const getCurrentLocation = async () => {
    setFollowDevice(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "ไม่สามารถเข้าถึงตำแหน่งได้");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const center = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setGeofenceCenter(center);
    moveCamera(center.latitude, center.longitude);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation
        showsMyLocationButton
        onPress={handleMapPress}
      >
        {geofenceCenter && (
          <>
            <Circle
              center={geofenceCenter}
              radius={radiusKm * 1000}
              strokeColor={inGeofence === false ? "rgba(220,0,0,0.9)" : "rgba(0,200,0,0.9)"}
              strokeWidth={2}
              fillColor={inGeofence === false ? "rgba(220,0,0,0.15)" : "rgba(0,200,0,0.15)"}
            />
            <Marker
              coordinate={geofenceCenter}
              image={Home_ICON}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            />
          </>
        )}

        {devicePos && (
          <Marker
            key="device"
            coordinate={devicePos}
            image={PAW_ICON}
            anchor={{ x: 0.5, y: 1 }}
            draggable={false}
          >
            <Callout>
              <View style={styles.calloutBox}>
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutTitle}>อุปกรณ์</Text>
                  <View style={[styles.calloutBadge, inGeofence ? styles.inArea : styles.outArea]}>
                    <Text style={styles.calloutBadgeText}>
                      {inGeofence ? "ในพื้นที่" : "นอกพื้นที่"}
                    </Text>
                  </View>
                </View>

                {!!latestThaiTime && (
                  <Text style={styles.calloutText}>เวลาไทย: {latestThaiTime}</Text>
                )}

                {latest && (
                  <>
                    <Text style={styles.calloutText}>Lat: {latest.lat?.toFixed?.(6)}</Text>
                    <Text style={styles.calloutText}>Lng: {latest.lng?.toFixed?.(6)}</Text>
                    {latest.sats != null && <Text style={styles.calloutText}>ดาวเทียม: {latest.sats}</Text>}
                    {latest.hdop != null && <Text style={styles.calloutText}>ความแม่นยำ: {latest.hdop}</Text>}
                  </>
                )}

                {geofenceCenter && devicePos && (
                  <Text style={styles.calloutText}>
                    📍 ห่างจากศูนย์กลาง:{" "}
                    <Text style={{ fontWeight: "bold" }}>
                      {Math.round(distanceMeters(devicePos, geofenceCenter))} ม.
                    </Text>
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      {/* ปุ่มซูม + ติดตาม */}
      <View style={[styles.zoomControls, { bottom: SHEET_HEIGHT + 44 }]}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            const z = Math.max(zoomLevel / 2, 0.001);
            setZoomLevel(z);
            moveCamera(region.latitude, region.longitude, z);
          }}
        >
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => {
            const z = Math.min(zoomLevel * 2, 1);
            setZoomLevel(z);
            moveCamera(region.latitude, region.longitude, z);
          }}
        >
          <Text style={styles.zoomText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.followBtn, followDevice ? styles.followOn : styles.followOff]}
          onPress={() => {
            const next = !followDevice;
            setFollowDevice(next);
            if (next && devicePos) moveCamera(devicePos.latitude, devicePos.longitude);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {followDevice ? "เลิกติดตาม" : "ติดตามอุปกรณ์"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet เลื่อนขึ้นลงได้ */}
      <Animated.View
        style={[
          styles.bottomPanel,
          {
            height: SHEET_HEIGHT,
            paddingBottom: Math.max(insets.bottom, 10),
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* แฮนเดิลสำหรับลาก */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handleBar} />
          <Text style={styles.panelTitle}>กำหนดพื้นที่ให้สัตว์เลี้ยง</Text>
        </View>

        {/* เนื้อหาข้างใน */}
        <View style={{ width: "100%" }}>
          <Text style={{ marginTop: 4 }}>
            รัศมี: {radiusKm >= 1 ? `${radiusKm.toFixed(1)} กม.` : `${Math.round(radiusKm * 1000)} ม.`}
          </Text>

          <Slider
            style={{ width: "100%", marginTop: 6 }}
            minimumValue={0.1}
            maximumValue={10}
            step={0.05}
            value={radiusKm}
            onValueChange={setRadiusKm}
            minimumTrackTintColor="#885900ff"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#885900ff"
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Text>1 กม.</Text>
            <Text>10 กม.</Text>
          </View>

          <View style={styles.panelButtons}>
            <TouchableOpacity
              style={[styles.actionBtn]}
              onPress={() => {
                if (!geofenceCenter) {
                  Alert.alert("ยังไม่ได้เลือกจุด", "แตะแผนที่เพื่อเลือกจุดศูนย์กลางก่อน");
                  return;
                }
                Alert.alert("ตั้งค่าสำเร็จ", "วงกลมถูกกำหนดแล้ว");
              }}
            >
              <Text style={styles.btnText}>บันทึก</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn]} onPress={clearGeofence}>
              <Text style={styles.btnText}>ล้างพื้นที่</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>กำหนดจุดศูนย์กลาง</Text>
            {pendingCoord && (
              <Text style={{ marginBottom: 8 }}>
                Lat: {pendingCoord.latitude.toFixed(6)} | Lng: {pendingCoord.longitude.toFixed(6)}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionBtn1} onPress={confirmPlaceHere}>
                <Text style={styles.btnText}>ใช้จุดนี้</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn2} onPress={getCurrentLocation}>
                <Text style={styles.btnText}>ใช้ตำแหน่งฉัน</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionBtn3}
              onPress={() => {
                setModalVisible(false);
                setPendingCoord(null);
              }}
            >
              <Text style={styles.btnText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  calloutBox: {
    minWidth: 200,
    maxWidth: 260,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#5c4033",
    marginBottom: 6,
  },
  calloutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calloutBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  inArea: { backgroundColor: "rgba(0,200,0,0.2)" },
  outArea: { backgroundColor: "rgba(220,0,0,0.2)" },
  calloutBadgeText: { fontSize: 12, fontWeight: "700", color: "#000" },
  calloutText: { fontSize: 14, color: "#333", marginBottom: 4 },

  zoomControls: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
  },
  zoomButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
    elevation: 6,
    marginBottom: 8,
  },
  zoomText: { fontSize: 24, fontWeight: "bold", color: "#333" },
  followBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  followOn: { backgroundColor: "#6c757d" },
  followOff: { backgroundColor: "#007bff" },

  bottomPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    padding: 10
  },
  handleArea: { alignItems: "center", marginBottom: 8 },
  handleBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#ccc", marginBottom: 8 },
  panelTitle: { fontSize: 16, fontWeight: "700" },

  panelButtons: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
    backgroundColor: "#f2bb14",
  },
  btnText: { color: "#fff", fontWeight: "bold" },

  modalContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
    width: "80%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  actionBtn1: { backgroundColor: "#007bff", paddingHorizontal: 30, paddingVertical: 10, borderRadius: 5 },
  actionBtn2: { backgroundColor: "#28a745", paddingHorizontal: 30, paddingVertical: 10, borderRadius: 5 },
  actionBtn3: { backgroundColor: "#6c757d", marginTop: 10, paddingHorizontal: 107, paddingVertical: 10, borderRadius: 5 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6, paddingHorizontal: 50 }
});
