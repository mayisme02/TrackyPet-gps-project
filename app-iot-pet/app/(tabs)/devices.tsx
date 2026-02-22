import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../firebase/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import ProfileHeader from "@/components/ProfileHeader";

type Device = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  type?: string;
};

export default function Devices() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceMatches, setDeviceMatches] = useState<Record<string, any>>({});

  /* ===== ADD DEVICE ===== */
  const [modalVisible, setModalVisible] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DEVICES (LOCAL) ================= */
  const loadDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem("devices");
      const parsed: any[] = stored ? JSON.parse(stored) : [];

      // ✅ Normalize + migrate old data + remove invalid items
      const normalized: Device[] = parsed
        .map((d) => {
          const code = String(d?.code ?? "").trim().toUpperCase();
          if (!code) return null;

          return {
            id: String(d?.id ?? code), // fallback id = code
            code,
            name: String(d?.name ?? "LilyGo A7670E"),
            type: String(d?.type ?? "GPS_TRACKER_A7670"),
            createdAt: String(d?.createdAt ?? new Date().toISOString()),
          } as Device;
        })
        .filter(Boolean) as Device[];

      // ✅ De-duplicate by code
      const seen = new Set<string>();
      const deduped = normalized.filter((d) => {
        if (seen.has(d.code)) return false;
        seen.add(d.code);
        return true;
      });

      setDevices(deduped);
      await AsyncStorage.setItem("devices", JSON.stringify(deduped));
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

  /* ================= DELETE DEVICE ================= */
  const deleteDevice = (device: Device) => {
    Alert.alert("ยกเลิกการเชื่อมต่ออุปกรณ์", "", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน",
        style: "destructive",
        onPress: async () => {
          const updated = devices.filter((d) => d.code !== device.code);
          await AsyncStorage.setItem("devices", JSON.stringify(updated));
          setDevices(updated);

          const active = await AsyncStorage.getItem("activeDevice");
          if (active === device.code) {
            await AsyncStorage.removeItem("activeDevice");
          }

          if (auth.currentUser) {
            const uid = auth.currentUser.uid;
            await deleteDoc(doc(db, "users", uid, "deviceMatches", device.code));
          }
        },
      },
    ]);
  };

  /* ================= ADD DEVICE ================= */
  const fetchLocation = async (code: string) => {
    try {
      setLoading(true);

      // ⚠️ โปรดักชันจริงให้ใช้โดเมน https://api.yourapp.com แทน IP LAN
      const res = await fetch("http://localhost:3000/api/device/location", {
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
    const code = tempCode.trim().toUpperCase();
    if (!code) return;

    const stored = await AsyncStorage.getItem("devices");
    const list: Device[] = stored ? JSON.parse(stored) : [];

    if (list.some((d: any) => String(d?.code ?? "").toUpperCase() === code)) {
      Alert.alert("อุปกรณ์ถูกเพิ่มแล้ว");
      return;
    }

    const ok = await fetchLocation(code);
    if (!ok) return;

    const newDevice: Device = {
      id: code, // ✅ ใช้ code เป็น id กันซ้ำ
      code,
      type: "GPS_TRACKER_A7670",
      name: "LilyGo A7670E",
      createdAt: new Date().toISOString(),
    };

    const updated = [...list, newDevice];

    await AsyncStorage.setItem("devices", JSON.stringify(updated));
    await AsyncStorage.setItem("activeDevice", code);

    setDevices(updated);
    setModalVisible(false);
    setTempCode("");
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
          <Image
            source={{ uri: deviceType.image.uri }}
            style={styles.deviceImage}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{item.name}</Text>

            {match ? (
              <TouchableOpacity
                onPress={(e: any) => {
                  // ✅ กันกดแล้วเด้งเข้า PetMatch
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
      {/* ✅ ให้ FlatList เป็นตัว scroll หลักตัวเดียว */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.code} // ✅ unique + stable
        renderItem={renderItem}
        style={{ backgroundColor: "#F3F4F6" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          flexGrow: 1, // ✅ ทำให้ empty อยู่กลางได้
        }}
        ListHeaderComponent={
          // ✅ ทำให้ header เต็มขอบจอ (แม้ list จะมี padding)
          <View
            style={{ marginHorizontal: -16, marginTop: -12, marginBottom: 12 }}
          >
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
            {/* ✅ ใช้ icon แบบเดียวกับ Tab */}
            <MaterialIcons name="devices" size={90} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>ยังไม่มีอุปกรณ์</Text>
            <Text style={styles.emptySub}>
              กดปุ่ม + เพื่อเพิ่มอุปกรณ์ติดตาม
            </Text>
          </View>
        }
      />

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

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    // Android
    elevation: 2,
  },

  deviceImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  deviceName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  connectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
    marginRight: 8,
  },
  connectText: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  disconnectRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 8,
    alignSelf: "flex-start",
  },
  disconnectText: {
    fontSize: 12.5,
    color: "#DC2626",
    fontWeight: "800",
  },

  petAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#fff",
  },
  emptyAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2F7",
    justifyContent: "center",
    alignItems: "center",
  },

  // ✅ NEW: empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "800",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#C0C4CC",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "84%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  modalRow: { flexDirection: "row", gap: 10 },
  submitBtn: {
    flex: 1,
    backgroundColor: "#905b0d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});