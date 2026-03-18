import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  Modal,
  TextInput,
  DeviceEventEmitter,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db, rtdb } from "../../firebase/firebase";
import { ref, set, get } from "firebase/database";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import ProfileHeader from "@/components/ProfileHeader";
import { styles } from "@/assets/styles/devices.styles";

type Device = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  type?: string;
};

const ACTIVE_DEVICE_CHANGED_EVENT = "activeDeviceChanged";
const DEVICES_CHANGED_EVENT = "devicesChanged";

const getDevicesStorageKey = (uid: string) => `devices_${uid}`;
const getActiveDeviceStorageKey = (uid: string) => `activeDevice_${uid}`;

export default function Devices() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceMatches, setDeviceMatches] = useState<Record<string, any>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DEVICES (LOCAL, PER USER) ================= */
  const loadDevices = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setDevices([]);
        return;
      }

      const devicesKey = getDevicesStorageKey(uid);
      const stored = await AsyncStorage.getItem(devicesKey);
      const parsed: any[] = stored ? JSON.parse(stored) : [];

      const normalized: Device[] = parsed
        .map((d) => {
          const code = String(d?.code ?? "")
            .trim()
            .toUpperCase();

          if (!code) return null;

          return {
            id: String(d?.id ?? code),
            code,
            name: String(d?.name ?? "LilyGo A7670E"),
            type: String(d?.type ?? "GPS_TRACKER_A7670"),
            createdAt: String(d?.createdAt ?? new Date().toISOString()),
          } as Device;
        })
        .filter(Boolean) as Device[];

      const seen = new Set<string>();
      const deduped = normalized.filter((d) => {
        if (seen.has(d.code)) return false;
        seen.add(d.code);
        return true;
      });

      setDevices(deduped);
      await AsyncStorage.setItem(devicesKey, JSON.stringify(deduped));
    } catch {
      setDevices([]);
    }
  };

  /* ================= LOAD MATCHES (FIRESTORE) ================= */
  const subscribeMatches = () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(collection(db, "users", uid, "deviceMatches"), (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setDeviceMatches(map);
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDevices();
      const unsub = subscribeMatches();
      return () => unsub && unsub();
    }, [])
  );

  useFocusEffect(
  React.useCallback(() => {
    void loadDevices();
    const unsub = subscribeMatches();

    const sub = DeviceEventEmitter.addListener(DEVICES_CHANGED_EVENT, () => {
      void loadDevices();
    });

    return () => {
      unsub && unsub();
      sub.remove();
    };
  }, [])
);

  /* ================= DELETE DEVICE ================= */
  const deleteDevice = (device: Device) => {
    Alert.alert("ยกเลิกการเชื่อมต่ออุปกรณ์", "", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน",
        style: "destructive",
        onPress: async () => {
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            const devicesKey = getDevicesStorageKey(uid);
            const activeDeviceKey = getActiveDeviceStorageKey(uid);

            const updated = devices.filter((d) => d.code !== device.code);
            await AsyncStorage.setItem(devicesKey, JSON.stringify(updated));
            setDevices(updated);

            const active = await AsyncStorage.getItem(activeDeviceKey);
            if (active === device.code) {
              await AsyncStorage.removeItem(activeDeviceKey);
              DeviceEventEmitter.emit(ACTIVE_DEVICE_CHANGED_EVENT, { code: null });
            }

            await deleteDoc(doc(db, "users", uid, "deviceMatches", device.code));

            DeviceEventEmitter.emit(DEVICES_CHANGED_EVENT);
          } catch {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบอุปกรณ์ได้");
          }
        },
      },
    ]);
  };

  /* ================= ADD DEVICE ================= */
  const fetchLocation = async (code: string) => {
    try {
      setLoading(true);

      const res = await fetch("http://192.168.31.136:3000/api/device/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: code }),
      });

      if (!res.ok) throw new Error();
      return true;
    } catch {
      Alert.alert("ไม่พบอุปกรณ์", "กรุณาตรวจสอบรหัสอุปกรณ์");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const confirmAddDevice = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("ยังไม่ได้เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อน");
      return;
    }

    const code = tempCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("กรุณากรอกรหัสอุปกรณ์");
      return;
    }

    const devicesKey = getDevicesStorageKey(uid);
    const activeDeviceKey = getActiveDeviceStorageKey(uid);

    const stored = await AsyncStorage.getItem(devicesKey);
    const list: Device[] = stored ? JSON.parse(stored) : [];

    if (list.some((d) => d.code === code)) {
      Alert.alert("อุปกรณ์ถูกเพิ่มแล้ว");
      return;
    }

    const ok = await fetchLocation(code);
    if (!ok) return;

    const newDevice: Device = {
      id: code,
      code,
      type: "GPS_TRACKER_A7670",
      name: "LilyGo A7670E",
      createdAt: new Date().toISOString(),
    };

    const updated = [...list, newDevice];

    await AsyncStorage.setItem(devicesKey, JSON.stringify(updated));
    await AsyncStorage.setItem(activeDeviceKey, code);

    setDevices(updated);
    setModalVisible(false);
    setTempCode("");

    DeviceEventEmitter.emit(DEVICES_CHANGED_EVENT, { code });
    DeviceEventEmitter.emit(ACTIVE_DEVICE_CHANGED_EVENT, { code });

    // optional ownerUid
    try {
      const ownerRef = ref(rtdb, `devices/${code}/ownerUid`);
      const ownerSnap = await get(ownerRef);

      if (!ownerSnap.exists()) {
        await set(ownerRef, uid);
      }
    } catch (e) {
      console.log("ownerUid warning:", e);
    }
  } catch (e) {
    console.log("confirmAddDevice error:", e);
    Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเพิ่มอุปกรณ์ได้");
  }
};

  /* ================= RENDER ITEM ================= */
  const renderItem = ({ item }: { item: Device }) => {
    const match = deviceMatches[item.code];

    const deviceType =
      (item.type && DEVICE_TYPES[item.type]) ||
      DEVICE_TYPES["GPS_TRACKER_A7670"];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/PetMatch",
            params: { device: JSON.stringify(item) },
          })
        }
      >
        <View style={styles.card}>
          <Image source={{ uri: deviceType.image.uri }} style={styles.deviceImage} />

          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{item.name}</Text>

            {match ? (
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  deleteDevice(item);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.disconnectRow}>
                  <MaterialIcons name="link-off" size={14} color="#DC2626" />
                  <Text style={styles.disconnectText}>ยกเลิกการเชื่อมต่อ</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.connectRow}>
                <View style={styles.connectDot} />
                <Text style={styles.connectText}>ยังไม่เชื่อมต่อ</Text>
              </View>
            )}
          </View>

          {match?.photoURL ? (
            <Image source={{ uri: match.photoURL }} style={styles.petAvatar} />
          ) : (
            <View style={styles.emptyAvatar}>
              <MaterialIcons name="pets" size={22} color="#9CA3AF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        style={{ backgroundColor: "#F3F4F6" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -16, marginTop: -12, marginBottom: 12 }}>
            <ProfileHeader
              title="อุปกรณ์"
              right={
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="add" size={28} color="#111827" />
                </TouchableOpacity>
              }
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialIcons name="devices" size={90} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>ยังไม่มีอุปกรณ์</Text>
            <Text style={styles.emptySub}>กดปุ่ม + เพื่อเพิ่มอุปกรณ์ติดตาม</Text>
          </View>
        }
      />

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
                style={[styles.submitBtn, { backgroundColor: "#9CA3AF" }]}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.submitText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={loading}
                onPress={confirmAddDevice}
              >
                <Text style={styles.submitText}>
                  {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}