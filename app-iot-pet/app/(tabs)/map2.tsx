import React, { useEffect, useRef, useState, useCallback } from "react";
import {Alert, Modal,StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,} from "react-native";
import MapView, {Callout,Circle,MapPressEvent,Marker,Region,} from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";

import { rtdb } from "../../firebase/firebase";
import { ref as dbRef, onValue, push, set } from "firebase/database";
import { useRef as useReactRef } from "react";


const DEVICE_ID = "DEVICE-01";
const PAW_ICON = require("../../assets/images/pow.png");
const HOME_ICON = require("../../assets/images/home.png");

// รัศมีเป็นกิโลเมตร
const MIN_RADIUS_KM = 0.005; // 5 เมตร
const MAX_RADIUS_KM = 500; // 500 กม.
const STEP_RADIUS_KM = 0.005; // ปรับครั้งละ 5 เมตร
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type AlertType = "exit" | "enter";

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

  // สำหรับตรวจจับทรานซิชันเข้า/ออกพื้นที่
  const prevInRef = useReactRef<boolean | null>(null);
  const lastAlertTsRef = useReactRef<number>(0);

  const [region, setRegion] = useState<Region>(initialRegion);
  const [zoomLevel, setZoomLevel] = useState(0.05);
  const [followDevice, setFollowDevice] = useState(true);
  const [devicePos, setDevicePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [latest, setLatest] = useState<Latest>(null);
  const [latestThaiTime, setLatestThaiTime] = useState<string>("-");

  // geofence
  const [geofenceCenter, setGeofenceCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(0.02); // เริ่มที่ ~20 เมตร

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchText, setSearchText] = useState("");
  const GOOGLE_API_KEY = "AIzaSyCSFB11ZL46SmsP15p9MSVnu6KkUhZPN40";

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

  // ระยะทาง (เมตร)
  const distanceMeters = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number }
  ) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const inGeofence =
    devicePos && geofenceCenter
      ? distanceMeters(devicePos, geofenceCenter) <= radiusKm * 1000
      : null;

  // ตำแหน่งอุปกรณ์ล่าสุด
  useEffect(() => {
    const r = dbRef(rtdb, `devices/${DEVICE_ID}/latest`);
    const off = onValue(r, (snap) => {
      const v = snap.val() as Latest;
      setLatest(v);

      if (v && typeof v.lat === "number" && typeof v.lng === "number") {
        const p = { latitude: v.lat, longitude: v.lng };
        setDevicePos(p);
        setLatestThaiTime(v?.th ?? "-");
        if (followDevice) moveCamera(p.latitude, p.longitude);
      }
    });
    return () => off();
  }, [zoomLevel, followDevice]);

  // ====== สร้างแจ้งเตือน
  const addAlert = useCallback(
    async (type: AlertType, message: string) => {
      try {
        const alertsRef = dbRef(rtdb, `devices/${DEVICE_ID}/alerts`);
        const keyRef = push(alertsRef);

        // ใช้เวลาฝั่งอุปกรณ์ถ้ามี (ภาษาไทย) เพื่อไม่ต้องแปลงในแอป
        const atTh = latest?.th ?? new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
        const atUtc = latest?.utc ?? new Date().toISOString();

        await set(keyRef, {
          type,
          message,
          radiusKm,
          device: DEVICE_ID,
          atTh,  
          atUtc,  
        });
      } catch (e) {
        console.warn("addAlert error", e);
      }
    },
    [radiusKm, latest]
  );

  //  ตรวจจับ เข้า/ออก 
  useEffect(() => {
    if (inGeofence === null) return;

    const prev = prevInRef.current;
    prevInRef.current = inGeofence;

    if (prev === null) return;

    // กันสแปม: อย่างน้อย 20 วินาทีกว่าจะแจ้งซ้ำ
    const now = Date.now();
    if (now - lastAlertTsRef.current < 20000) return;

    if (prev === true && inGeofence === false) {
      lastAlertTsRef.current = now;
      const msg = `สัตว์เลี้ยงออกนอกพื้นที่ (รัศมี ${
        radiusKm >= 1 ? `${radiusKm.toFixed(1)} กม.` : `${Math.round(radiusKm * 1000)} ม.`
      })`;
      addAlert("exit", msg);
    } else if (prev === false && inGeofence === true) {
      lastAlertTsRef.current = now;
      addAlert("enter", "สัตว์เลี้ยงกลับเข้าพื้นที่แล้ว");
    }
  }, [inGeofence, radiusKm, addAlert]);

  // Map interactions 
  const handleMapPress = (e: MapPressEvent) => {
    setFollowDevice(false);
    const { coordinate } = e.nativeEvent;
    setPendingCoord({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
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
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    const center = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    setGeofenceCenter(center);
    moveCamera(center.latitude, center.longitude);
    setModalVisible(false);
  };

  const searchLocation = async () => {
    if (!searchText.trim()) {
      Alert.alert("กรุณากรอกสถานที่");
      return;
    }
    try {
      const res = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: { address: searchText, key: GOOGLE_API_KEY, language: "th" },
        }
      );
      if (res.data.status === "OK") {
        setFollowDevice(false);
        const { lat, lng } = res.data.results[0].geometry.location;
        const center = { latitude: lat, longitude: lng };
        setGeofenceCenter(center);
        moveCamera(lat, lng);
      } else {
        Alert.alert("ไม่พบสถานที่", `ไม่พบผลลัพธ์สำหรับ "${searchText}"`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถค้นหาสถานที่ได้");
    }
  };

  //  UI 
  return (
    <View style={styles.container}>
      {/* แถบค้นหา */}
      <View className="search" style={styles.searchContainer}>
        <TextInput
          placeholder="ค้นหาสถานที่..."
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          onSubmitEditing={searchLocation}
          returnKeyType="search"
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={searchLocation} style={styles.searchButton}>
          <Text>ค้นหา</Text>
        </TouchableOpacity>
      </View>

      {/* แผนที่ */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation
        showsMyLocationButton
        onPress={handleMapPress}
      >
        {/* วงกลม Geofence + หมุดบ้าน */}
        {geofenceCenter && (
          <>
            <Circle
              center={geofenceCenter}
              radius={radiusKm * 1000} // km -> m
              strokeColor={
                inGeofence === false
                  ? "rgba(220,0,0,0.9)"
                  : "rgba(0,122,255,0.9)"
              }
              strokeWidth={2}
              fillColor={
                inGeofence === false
                  ? "rgba(220,0,0,0.15)"
                  : "rgba(0,122,255,0.15)"
              }
            />
            <Marker
              key="home"
              coordinate={geofenceCenter}
              image={HOME_ICON}
              anchor={{ x: 0.5, y: 1 }}
            />
          </>
        )}

        {/* หมุดอุปกรณ์ */}
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
                <Text style={styles.calloutTitle}>อุปกรณ์</Text>
                {!!latestThaiTime && <Text>เวลาไทย: {latestThaiTime}</Text>}
                {latest && (
                  <>
                    <Text>Lat: {latest.lat?.toFixed?.(6)}</Text>
                    <Text>Lng: {latest.lng?.toFixed?.(6)}</Text>
                    {latest.sats != null && <Text>Sats: {latest.sats}</Text>}
                    {latest.hdop != null && <Text>HDOP: {latest.hdop}</Text>}
                  </>
                )}
                {geofenceCenter && devicePos && (
                  <>
                    <Text>
                      ห่างจากศูนย์กลาง:{" "}
                      {Math.round(distanceMeters(devicePos, geofenceCenter))} ม.
                    </Text>
                    <Text
                      style={{
                        color: inGeofence ? "#28a745" : "#d00",
                        fontWeight: "700",
                      }}
                    >
                      {inGeofence ? "อยู่ในพื้นที่" : "ออกนอกพื้นที่"}
                    </Text>
                  </>
                )}
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      {/* ปุ่มซูม/ติดตามอุปกรณ์ */}
      <View style={styles.zoomControls}>
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
            if (next && devicePos)
              moveCamera(devicePos.latitude, devicePos.longitude);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {followDevice ? "เลิกติดตาม" : "ติดตามอุปกรณ์"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* แผงควบคุมวงกลม */}
      <View style={[styles.bottomPanel, { bottom: insets.bottom + 16 }]}>
        <Text style={styles.panelTitle}>กำหนดพื้นที่ให้สัตว์เลี้ยง</Text>
        <Text style={{ marginTop: 4 }}>
          รัศมี:{" "}
          {radiusKm >= 1
            ? `${radiusKm.toFixed(1)} กม.`
            : `${Math.round(radiusKm * 1000)} ม.`}
        </Text>

        {/* ปุ่ม − / + ปรับรัศมี */}
        <View style={styles.radiusRow}>
          <TouchableOpacity
            style={[styles.radiusBtn, styles.radiusBtnMinus]}
            onPress={() =>
              setRadiusKm((prev) =>
                clamp(
                  parseFloat((prev - STEP_RADIUS_KM).toFixed(3)),
                  MIN_RADIUS_KM,
                  MAX_RADIUS_KM
                )
              )
            }
            onLongPress={() =>
              setRadiusKm((prev) =>
                clamp(
                  parseFloat((prev - STEP_RADIUS_KM * 10).toFixed(3)),
                  MIN_RADIUS_KM,
                  MAX_RADIUS_KM
                )
              )
            }
            delayLongPress={250}
          >
            <Text style={styles.radiusBtnText}>−</Text>
          </TouchableOpacity>

          <Text style={styles.radiusValue}>
            {radiusKm >= 1
              ? `${radiusKm.toFixed(2)} กม.`
              : `${Math.round(radiusKm * 1000)} ม.`}
          </Text>

          <TouchableOpacity
            style={[styles.radiusBtn, styles.radiusBtnPlus]}
            onPress={() =>
              setRadiusKm((prev) =>
                clamp(
                  parseFloat((prev + STEP_RADIUS_KM).toFixed(3)),
                  MIN_RADIUS_KM,
                  MAX_RADIUS_KM
                )
              )
            }
            onLongPress={() =>
              setRadiusKm((prev) =>
                clamp(
                  parseFloat((prev + STEP_RADIUS_KM * 10).toFixed(3)),
                  MIN_RADIUS_KM,
                  MAX_RADIUS_KM
                )
              )
            }
            delayLongPress={250}
          >
            <Text style={styles.radiusBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Slider
          style={{ width: "100%", marginTop: 6 }}
          minimumValue={MIN_RADIUS_KM}
          maximumValue={MAX_RADIUS_KM}
          step={STEP_RADIUS_KM}
          value={radiusKm}
          onValueChange={setRadiusKm}
          minimumTrackTintColor="#f2bb14"
          maximumTrackTintColor="#ddd"
          thumbTintColor="#b87300"
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Text>5 ม.</Text>
          <Text>500 กม.</Text>
        </View>

        <View style={styles.panelButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#28a745" }]}
            onPress={() => {
              if (!geofenceCenter) {
                Alert.alert(
                  "ยังไม่ได้เลือกจุด",
                  "แตะแผนที่เพื่อเลือกจุดศูนย์กลางก่อน"
                );
                return;
              }
              Alert.alert("ตั้งค่าสำเร็จ", "วงกลมถูกกำหนดแล้ว");
              // บันทึก config ลง RTDB:
              // set(dbRef(rtdb, `devices/${DEVICE_ID}/geofence`), { center: geofenceCenter, radiusKm });
            }}
          >
            <Text style={styles.btnText}>ตั้งค่า</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#6c757d" }]}
            onPress={clearGeofence}
          >
            <Text style={styles.btnText}>ล้างพื้นที่</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#007bff" }]}
            onPress={getCurrentLocation}
          >
            <Text style={styles.btnText}>ใช้ตำแหน่งฉัน</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* โมดัลยืนยันจุดศูนย์กลาง */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>กำหนดจุดศูนย์กลาง</Text>
            {pendingCoord && (
              <Text style={{ marginBottom: 8 }}>
                Lat: {pendingCoord.latitude.toFixed(6)} | Lng:{" "}
                {pendingCoord.longitude.toFixed(6)}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#007bff" }]}
                onPress={confirmPlaceHere}
              >
                <Text style={styles.btnText}>ใช้จุดนี้</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#28a745" }]}
                onPress={getCurrentLocation}
              >
                <Text style={styles.btnText}>ใช้ตำแหน่งฉัน</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: "#6c757d", marginTop: 10 },
              ]}
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

  // Search
  searchContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    zIndex: 10,
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: "#f5f5f5",
    color: "#333",
  },
  searchButton: {
    backgroundColor: "#f2bb14",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },

  // Radius controls
  radiusRow: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  radiusBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  radiusBtnMinus: { backgroundColor: "#e0e0e0" },
  radiusBtnPlus: { backgroundColor: "#f2bb14" },
  radiusBtnText: { fontSize: 24, fontWeight: "700", color: "#222" },
  radiusValue: { fontSize: 16, fontWeight: "700" },

  // Callout
  calloutBox: {
    minWidth: 180,
    maxWidth: 260,
    padding: 8,
    backgroundColor: "white",
    borderRadius: 8,
  },
  calloutTitle: { fontWeight: "700", marginBottom: 2 },

  // Zoom & follow
  zoomControls: {
    position: "absolute",
    right: 16,
    bottom: 280,
    alignItems: "center",
  },
  zoomButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  zoomText: { fontSize: 24, fontWeight: "bold", color: "#333" },
  followBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  followOn: { backgroundColor: "#28a745" },
  followOff: { backgroundColor: "#6c757d" },

  // Bottom panel
  bottomPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
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
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
    width: "80%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
});
