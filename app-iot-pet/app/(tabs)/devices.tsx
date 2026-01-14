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

type Device = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
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
        },
      },
    ]);
  };

  /* =====================
     RENDER ITEM
  ====================== */
  const renderItem = ({ item }: { item: Device }) => {
    const match = deviceMatches[item.code];

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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* PROFILE */}
            {match?.photoURL ? (
              <Image source={{ uri: match.photoURL }} style={styles.petAvatar} />
            ) : (
              <View style={styles.emptyAvatar}>
                <MaterialIcons name="pets" size={26} color="#999" />
              </View>
            )}

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.deviceName}>{item.name}</Text>
              {/* STATUS */}
              <View style={styles.connectRow}>
                <View style={styles.connectDot} />
                <Text style={styles.connectText}>กำลังเชื่อมต่อ</Text>
              </View>

              {match && (
                <Text style={styles.petName}>ผูกกับ {match.petName}</Text>
              )}

            </View>
          </View>

          <TouchableOpacity onPress={() => deleteDevice(item)}>
            <Text style={styles.remove}>ยกเลิก</Text>
          </TouchableOpacity>
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
    backgroundColor: "#f2bb14"
  },
  header: {
    backgroundColor: "#f2bb14",
    paddingVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  listContainer: {
    padding: 16
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "700"
  },
  petName: {
    fontSize: 13,
    color: "#555"
  },
  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#e7f9ef",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  connectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  connectText: {
    fontSize: 13,
    color: "#22c55e",
    fontWeight: "600",
  },
  petAvatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },
  emptyAvatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  remove: {
    color: "red",
    fontWeight: "600"
  },
});
