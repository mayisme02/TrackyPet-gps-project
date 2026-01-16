import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";

/* =====================
   TYPES
====================== */
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

  /* =====================
     LOAD DEVICES (LOCAL)
  ====================== */
  const loadDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem("devices");
      setDevices(stored ? JSON.parse(stored) : []);
    } catch {
      setDevices([]);
    }
  };

  /* =====================
     LOAD MATCHES (FIREBASE)
  ====================== */
  const subscribeMatches = () => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const ref = collection(db, "users", uid, "deviceMatches");

    return onSnapshot(ref, (snap) => {
      const map: any = {};
      snap.docs.forEach((doc) => {
        map[doc.id] = doc.data();
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

  /* =====================
     DELETE DEVICE (LOCAL)
  ====================== */
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
        },
      },
    ]);
  };

  /* =====================
     RENDER ITEM
  ====================== */
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
          {/* LEFT : DEVICE IMAGE */}
          <View style={styles.leftSection}>
            <Image
              source={{ uri: deviceType.image.uri }}
              style={styles.deviceImage}
            />
          </View>

          {/* CENTER : INFO */}
          <View style={styles.centerSection}>
            <Text style={styles.deviceName}>{item.name}</Text>

            {/* REPLACE STATUS WITH DISCONNECT */}
            {match ? (
              <TouchableOpacity onPress={() => deleteDevice(item)}>
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

          {/* RIGHT : PET */}
          <View style={styles.rightSection}>
            {match?.photoURL ? (
              <Image
                source={{ uri: match.photoURL }}
                style={styles.petAvatar}
              />
            ) : (
              <View style={styles.emptyAvatar}>
                <MaterialIcons name="pets" size={22} color="#999" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>อุปกรณ์</Text>
        </View>
      </SafeAreaView>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>ยังไม่มีอุปกรณ์</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f2bb14",
  },
  header: {
    backgroundColor: "#f2bb14",
    paddingVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  listContainer: {
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  leftSection: {
    marginRight: 12,
  },
  centerSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: "center",
  },

  deviceImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "700",
  },

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
  connectText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },

  disconnectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
  },
  disconnectText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  petAvatar: {
    width: 50,
    height: 50,
    borderRadius: 26,
  },
  emptyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 26,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
});