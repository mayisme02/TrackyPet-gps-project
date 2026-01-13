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
     LOAD DEVICES (REFRESH ON FOCUS)
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
      `ต้องการลบ ${device.code} ใช่หรือไม่`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          style: "destructive",
          onPress: async () => {
            const updated = devices.filter((d) => d.id !== device.id);
            await AsyncStorage.setItem("devices", JSON.stringify(updated));

            // แจ้งหน้า Map ว่า device นี้ถูกลบแล้ว
            await AsyncStorage.setItem("removedDevice", device.code);

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
        <Text style={styles.deviceCode}>{item.code}</Text>
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
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: { 
    fontSize: 16, 
    fontWeight: "700" 
  },
  deviceCode: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 4 
  },
  remove: { 
    color: "red", 
    fontWeight: "600" 
  },
});