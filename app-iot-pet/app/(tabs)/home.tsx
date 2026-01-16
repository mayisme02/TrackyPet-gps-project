import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { auth, db } from "../../firebase/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";

/* ================= TYPES ================= */
interface Pet {
  id: string;
  name: string;
  photoURL?: string;
}

interface ActiveDevice {
  code: string;
  type: string;
}

interface LastLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface MatchedPet {
  petId: string;
  petName: string;
  photoURL?: string | null;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pets, setPets] = useState<Pet[]>([]);
  const [device, setDevice] = useState<ActiveDevice | null>(null);
  const [matchedPet, setMatchedPet] = useState<MatchedPet | null>(null);

  const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // ✅ แยกอำเภอ / จังหวัด (เพิ่มใหม่)
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [provinceName, setProvinceName] = useState<string | null>(null);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    return onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });
  }, []);

  /* ================= LOAD PETS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "users", auth.currentUser.uid, "pets"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      setPets(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Pet, "id">),
        }))
      );
    });
  }, []);

  /* ================= LOAD ACTIVE DEVICE ================= */
  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const code = await AsyncStorage.getItem("activeDevice");
        const stored = await AsyncStorage.getItem("devices");
        const devices = stored ? JSON.parse(stored) : [];
        const found = devices.find((d: any) => d.code === code);
        setDevice(found ? { code: found.code, type: found.type } : null);
      };
      load();
    }, [])
  );

  /* ================= LOAD MATCHED PET ================= */
  useEffect(() => {
    if (!auth.currentUser || !device?.code) {
      setMatchedPet(null);
      return;
    }

    const uid = auth.currentUser.uid;

    return onSnapshot(
      doc(db, "users", uid, "deviceMatches", device.code),
      (snap) => {
        if (!snap.exists()) {
          setMatchedPet(null);
          return;
        }

        const data = snap.data();
        setMatchedPet({
          petId: data.petId,
          petName: data.petName,
          photoURL: data.photoURL ?? null,
        });
      }
    );
  }, [device]);

  /* ================= LOAD LAST LOCATION ================= */
  const fetchLastLocation = async (code: string) => {
    try {
      setLocationLoading(true);
      const res = await fetch("http://localhost:3000/api/device/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: code }),
      });
      if (!res.ok) throw new Error();

      const data = await res.json();
      setLastLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp ?? new Date().toISOString(),
      });
    } catch {
      setLastLocation(null);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (device?.code) fetchLastLocation(device.code);
    else setLastLocation(null);
  }, [device]);

  /* ================= REVERSE GEOCODE ================= */
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      const addr = data.address ?? {};

      const district =
        addr.district ||
        addr.county ||
        addr.city ||
        null;

      const province =
        addr.province ||
        addr.state ||
        null;

      setDistrictName(district);
      setProvinceName(province);
    } catch {
      setDistrictName(null);
      setProvinceName(null);
    }
  };

  useEffect(() => {
    if (lastLocation) {
      reverseGeocode(lastLocation.latitude, lastLocation.longitude);
    } else {
      setDistrictName(null);
      setProvinceName(null);
    }
  }, [lastLocation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#f2bb14" />
      </SafeAreaView>
    );
  }

  const name = profile?.username ?? "-";
  const avatar = profile?.avatarUrl ?? "";
  const deviceInfo = device ? DEVICE_TYPES[device.type] : null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <SafeAreaView style={styles.header}>
          <View style={styles.headerRow}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={48} color="#fff" />
            )}
            <Text style={styles.greeting}>สวัสดี! {name}</Text>
          </View>
        </SafeAreaView>
      }
    >
      {/* ===== PET SECTION ===== */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => router.push("/(modals)/pet")}
      >
        <Text style={styles.sectionTitle}>สัตว์เลี้ยงของคุณ</Text>
        {pets.length > 0 && (
          <View style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
        )}
      </Pressable>

      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pets.map((p, i) => (
            <View key={p.id} style={[styles.petBox, i === 0 && { marginLeft: 16 }]}>
              {p.photoURL ? (
                <Image source={{ uri: p.photoURL }} style={styles.petImg} />
              ) : (
                <View style={styles.petPlaceholder}>
                  <MaterialIcons name="pets" size={36} color="#fff" />
                </View>
              )}
              <Text style={styles.petName}>{p.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ===== DEVICE SECTION ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>อุปกรณ์</Text>
      </View>

      <View style={styles.card}>
        {device && deviceInfo ? (
          <View style={styles.deviceRow}>
            <Image source={deviceInfo.image} style={styles.deviceImg} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.deviceName}>{deviceInfo.name}</Text>
            </View>
            <View style={styles.status}>
              <View style={styles.dot} />
              <Text style={styles.statusText}>เชื่อมต่ออยู่</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>ยังไม่มีอุปกรณ์ที่เชื่อมต่อ</Text>
          </View>
        )}
      </View>

      {/* ===== LAST LOCATION ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ตำแหน่งล่าสุด</Text>
      </View>

      <View style={[styles.card, { marginBottom: 32 }]}>
        {locationLoading ? (
          <ActivityIndicator color="#f2bb14" />
        ) : lastLocation && matchedPet ? (
          <View style={styles.locationRow}>
            <View style={styles.petMarkerPreview}>
              {matchedPet.photoURL ? (
                <Image
                  source={{ uri: matchedPet.photoURL }}
                  style={styles.markerPetImg}
                />
              ) : (
                <MaterialIcons name="pets" size={20} color="#7A4A00" />
              )}
              <View style={styles.miniPin}>
                <Ionicons name="location-sharp" size={14} color="#fff" />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.locationText}>
                {districtName ?? "ไม่ทราบอำเภอ"}
              </Text>
              <Text style={styles.locationSubText}>
                {provinceName ?? "ไม่ทราบจังหวัด"}
              </Text>
              <Text style={styles.locationTime}>
                อัปเดตล่าสุด:{" "}
                {new Date(lastLocation.timestamp).toLocaleTimeString("th-TH")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => router.push("/(tabs)/maps")}
            >
              <MaterialIcons name="map" size={20} color="#fff" />
              <Text style={styles.mapBtnText}>ดูแผนที่</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>ยังไม่มีข้อมูลตำแหน่งล่าสุด</Text>
          </View>
        )}
      </View>
    </ParallaxScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { height: 175, justifyContent: "center", paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  greeting: { fontSize: 20, fontWeight: "700", marginLeft: 12 },

  sectionHeader: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2bb14",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  petBox: { alignItems: "center", marginRight: 16 },
  petImg: { width: 80, height: 80, borderRadius: 16 },
  petPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
  },
  petName: { marginTop: 8, fontSize: 16, fontWeight: "500" },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  deviceImg: { width: 48, height: 48, borderRadius: 12 },
  deviceName: { fontSize: 16, fontWeight: "600" },

  status: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2ECC71",
    marginRight: 6,
  },
  statusText: { fontSize: 14, fontWeight: "500" },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  petMarkerPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  markerPetImg: { width: 42, height: 42, borderRadius: 20 },
  miniPin: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#f2bb14",
    borderRadius: 8,
    padding: 2,
  },

  locationText: { fontSize: 15, fontWeight: "600" },
  locationSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  locationTime: { marginTop: 4, fontSize: 13, color: "#888" },

  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2bb14",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mapBtnText: {
    marginLeft: 6,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  emptyCenter: { alignItems: "center", paddingVertical: 28 },
  emptyText: { color: "#aaa", fontSize: 15 },
});