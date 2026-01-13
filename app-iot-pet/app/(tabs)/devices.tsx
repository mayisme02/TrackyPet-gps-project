import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

type Device = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);

  /* =====================
     LOAD DEVICES
  ====================== */
  const loadDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem("devices");
      setDevices(stored ? JSON.parse(stored) : []);
    } catch {
      setDevices([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDevices();
    }, [])
  );

  /* =====================
     DELETE DEVICE
  ====================== */
  const deleteDevice = (device: Device) => {
    Alert.alert(
      "ยกเลิกการเชื่อมต่อ",
      "",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          style: "destructive",
          onPress: async () => {
            const updated = devices.filter((d) => d.id !== device.id);
            await AsyncStorage.setItem("devices", JSON.stringify(updated));

            // แจ้งหน้า Map ว่า device นี้ถูกลบแล้ว
            const active = await AsyncStorage.getItem("activeDevice");
            if (active === device.code) {
              await AsyncStorage.removeItem("activeDevice");
            }
            setDevices(updated);
          },
        },
      ]
    );
  };

  /* =====================
     RENDER ITEM
  ====================== */
  const renderItem = ({ item }: { item: Device }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.deviceName}>{item.name}</Text>

        {/* 🟢 กำลังเชื่อมต่อ (ย้ายมาไว้ด้านล่าง) */}
        <View style={styles.connectRow}>
          <View style={styles.connectDot} />
          <Text style={styles.connectText}>กำลังเชื่อมต่อ</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => deleteDevice(item)}>
        <Text style={styles.remove}>ยกเลิก</Text>
      </TouchableOpacity>
    </View>
  );

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

  /* =====================
     CARD
  ====================== */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  deviceName: {
    fontSize: 18,
    fontWeight: "700",
  },

  /* =====================
     CONNECT STATUS (BOTTOM)
  ====================== */
  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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

  remove: {
    color: "red",
    fontWeight: "600",
  },
});