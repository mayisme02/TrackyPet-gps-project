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
  const [deviceMatches, setDeviceMatches] = useState<any>({});

  /* ===== ADD DEVICE ===== */
  const [modalVisible, setModalVisible] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DEVICES (LOCAL) ================= */
  const loadDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem("devices");
      setDevices(stored ? JSON.parse(stored) : []);
    } catch {
      setDevices([]);
    }
  };

  /* ================= LOAD MATCHES (FIRESTORE) ================= */
  const subscribeMatches = () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      collection(db, "users", uid, "deviceMatches"),
      (snap) => {
        const map: any = {};
        snap.docs.forEach((doc) => {
          map[doc.id] = doc.data();
        });
        setDeviceMatches(map);
      }
    );
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
          const updated = devices.filter((d) => d.id !== device.id);
          await AsyncStorage.setItem("devices", JSON.stringify(updated));
          setDevices(updated);

          const active = await AsyncStorage.getItem("activeDevice");
          if (active === device.code) {
            await AsyncStorage.removeItem("activeDevice");
          }

          if (auth.currentUser) {
            const uid = auth.currentUser.uid;
            await deleteDoc(
              doc(db, "users", uid, "deviceMatches", device.code)
            );
          }
        },
      },
    ]);
  };

  /* ================= ADD DEVICE ================= */
  const fetchLocation = async (code: string) => {
    try {
      setLoading(true);
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
    const list = stored ? JSON.parse(stored) : [];

    if (list.some((d: any) => d.code === code)) {
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
        activeOpacity={0.85}
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
              <TouchableOpacity onPress={() => deleteDevice(item)}>
                <View style={styles.disconnectRow}>
                  <MaterialIcons name="link-off" size={14} color="#DC2626" />
                  <Text style={styles.disconnectText}>
                    ยกเลิกการเชื่อมต่อ
                  </Text>
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
              <MaterialIcons name="pets" size={22} color="#999" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* ===== HEADER (Component) ===== */}
      <ProfileHeader
        title="อุปกรณ์"
        right={
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <MaterialIcons name="add" size={26} color="#000" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.noDeviceText}>ยังไม่มีอุปกรณ์</Text>
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
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deviceImage: { width: 56, height: 56, borderRadius: 12 },
  deviceName: { fontSize: 17, fontWeight: "700" },

  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  connectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
    marginRight: 6,
  },
  connectText: { fontSize: 13, color: "#6B7280" },

  disconnectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
    alignSelf: "flex-start",
  },
  disconnectText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
  },

  petAvatar: { width: 50, height: 50, borderRadius: 25 },
  emptyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },

  noDeviceText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#959595",
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
});
