import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  deleteDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";
import { styles } from "@/assets/styles/home.styles";

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

const ACTIVE_DEVICE_CHANGED_EVENT = "activeDeviceChanged";
const DEVICES_CHANGED_EVENT = "devicesChanged";

const getDevicesStorageKey = (uid: string) => `devices_${uid}`;
const getActiveDeviceStorageKey = (uid: string) => `activeDevice_${uid}`;

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pets, setPets] = useState<Pet[]>([]);
  const [device, setDevice] = useState<ActiveDevice | null>(null);
  const [matchedPet, setMatchedPet] = useState<MatchedPet | null>(null);

  const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [districtName, setDistrictName] = useState<string | null>(null);
  const [provinceName, setProvinceName] = useState<string | null>(null);

  const [petMatchMap, setPetMatchMap] = useState<Record<string, boolean>>({});

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    return onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile(null);
      }
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
  const loadActiveDevice = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return; // อย่ารีบ setDevice(null)

    const activeDeviceKey = getActiveDeviceStorageKey(uid);
    const devicesKey = getDevicesStorageKey(uid);

    const code = await AsyncStorage.getItem(activeDeviceKey);
    const stored = await AsyncStorage.getItem(devicesKey);
    const devices = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(devices) || devices.length === 0) {
      setDevice(null);
      return;
    }

    let found = devices.find((d: any) => d.code === code);

    if (!found) {
      found = devices[0];
      await AsyncStorage.setItem(activeDeviceKey, found.code);
    }

    setDevice({
      code: found.code,
      type: found.type ?? "GPS_TRACKER_A7670",
    });
  };

  /* ================= LOAD MATCHED PET (LATEST PET DATA) ================= */
useEffect(() => {
  if (!auth.currentUser || !device?.code) {
    setMatchedPet(null);
    return;
  }

  const uid = auth.currentUser.uid;
  let unsubPet: null | (() => void) = null;

  const unsubMatch = onSnapshot(
    doc(db, "users", uid, "deviceMatches", device.code),
    (matchSnap) => {
      if (unsubPet) {
        unsubPet();
        unsubPet = null;
      }

      if (!matchSnap.exists()) {
        setMatchedPet(null);
        return;
      }

      const matchData = matchSnap.data() as any;
      const matchedPetId = matchData.petId;

      if (!matchedPetId) {
        setMatchedPet(null);
        return;
      }

      unsubPet = onSnapshot(
        doc(db, "users", uid, "pets", matchedPetId),
        (petSnap) => {
          if (!petSnap.exists()) {
            setMatchedPet({
              petId: matchedPetId,
              petName: matchData.petName ?? "สัตว์เลี้ยง",
              photoURL: matchData.photoURL ?? null,
            });
            return;
          }

          const petData = petSnap.data() as any;

          setMatchedPet({
            petId: matchedPetId,
            petName: petData.name ?? matchData.petName ?? "สัตว์เลี้ยง",
            photoURL: petData.photoURL ?? null,
          });
        }
      );
    }
  );

  return () => {
    if (unsubPet) unsubPet();
    unsubMatch();
  };
}, [device?.code]);

  /* ================= LOAD PET MATCH MAP ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(collection(db, "users", uid, "deviceMatches"), (snap) => {
      const map: Record<string, boolean> = {};
      snap.docs.forEach((d) => {
        map[d.data().petId] = true;
      });
      setPetMatchMap(map);
    });
  }, []);

  const fetchLastLocation = async (code: string) => {
    try {
      setLocationLoading(true);

      const res = await fetch("http://192.168.31.136:3000/api/device/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: code }),
      });

      if (!res.ok) throw new Error("Failed to fetch location");

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
    if (device?.code) {
      fetchLastLocation(device.code);
    } else {
      setLastLocation(null);
    }
  }, [device]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      const addr = data.address ?? {};

      setDistrictName(addr.district || addr.county || addr.city || null);
      setProvinceName(addr.province || addr.state || null);
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

  useFocusEffect(
    React.useCallback(() => {
      void loadActiveDevice();

      const sub = DeviceEventEmitter.addListener(
        ACTIVE_DEVICE_CHANGED_EVENT,
        () => {
          void loadActiveDevice();
        }
      );

      return () => sub.remove();
    }, [])
  );

  const disconnectActiveDevice = () => {
    if (!device?.code) return;

    Alert.alert("ยกเลิกการเชื่อมต่ออุปกรณ์", "", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;

          const targetCode = device.code;
          const devicesKey = getDevicesStorageKey(uid);
          const activeDeviceKey = getActiveDeviceStorageKey(uid);

          const stored = await AsyncStorage.getItem(devicesKey);
          const list = stored ? JSON.parse(stored) : [];
          const updated = Array.isArray(list)
            ? list.filter(
              (d: any) => String(d?.code ?? "").toUpperCase() !== targetCode
            )
            : [];

          await AsyncStorage.setItem(devicesKey, JSON.stringify(updated));

          const active = await AsyncStorage.getItem(activeDeviceKey);
          if (active === targetCode) {
            await AsyncStorage.removeItem(activeDeviceKey);
          }

          try {
            await deleteDoc(doc(db, "users", uid, "deviceMatches", targetCode));
          } catch { }

          setDevice(null);
          setMatchedPet(null);
          setLastLocation(null);
          setDistrictName(null);
          setProvinceName(null);

          DeviceEventEmitter.emit(ACTIVE_DEVICE_CHANGED_EVENT, { code: null });
          DeviceEventEmitter.emit(DEVICES_CHANGED_EVENT);
        },
      },
    ]);
  };

  const goToPetMatch = () => {
    if (!device) return;

    const deviceInfo = DEVICE_TYPES[device.type] || null;

    router.push({
      pathname: "/PetMatch",
      params: {
        device: JSON.stringify({
          id: device.code,
          code: device.code,
          type: device.type,
          name: deviceInfo?.name ?? "GPS Tracker",
          createdAt: new Date().toISOString(),
        }),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#f2bb14" />
      </SafeAreaView>
    );
  }

  const fallbackNameFromEmail =
    auth.currentUser?.email?.split("@")[0] || "ผู้ใช้งาน";

  const name =
    profile?.username ||
    profile?.name ||
    profile?.displayName ||
    profile?.fullName ||
    fallbackNameFromEmail;

  const avatar =
    profile?.avatarUrl ||
    profile?.photoURL ||
    profile?.profileImage ||
    "";

  const deviceInfo = device ? DEVICE_TYPES[device.type] : null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f2bb14", dark: "#f2bb14" }}
      headerImage={
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={26} color="#9E9E9E" />
              </View>
            )}

            <Text
              style={styles.greeting}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              สวัสดี! {name}
            </Text>
          </View>
        </View>
      }
    >
      <Pressable
        style={styles.sectionHeader}
        onPress={() => router.push("/(modals)/PetList")}
      >
        <Text style={styles.sectionTitle}>สัตว์เลี้ยงของคุณ</Text>
        {pets.length > 0 && (
          <View style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
        )}
      </Pressable>

      <View style={[styles.card, pets.length === 0 && styles.emptyCardLarge]}>
        {pets.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pets.map((p, i) => {
              const isConnected = petMatchMap[p.id];

              return (
                <View key={p.id} style={[styles.petBox, i === 0 && { marginLeft: 16 }]}>
                  <View>
                    {p.photoURL ? (
                      <Image source={{ uri: p.photoURL }} style={styles.petImg} />
                    ) : (
                      <View style={styles.petPlaceholder}>
                        <MaterialIcons name="pets" size={36} color="#fff" />
                      </View>
                    )}

                    {isConnected && (
                      <View style={styles.gpsBadge}>
                        <Text style={styles.gpsText}>GPS</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.petName}>{p.name}</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyCenterLarge}>
            <MaterialIcons name="pets" size={34} color="#C8C8C8" />
            <Text style={styles.emptyTitle}>ยังไม่มีสัตว์เลี้ยง</Text>

            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push("/(modals)/PetList")}
            >
              <Text style={styles.emptyActionText}>เพิ่มสัตว์เลี้ยง</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.routeCard}
        onPress={() => router.push("/(modals)/RouteHistoryList")}
      >
        <Image
          source={require("../../assets/images/destination.png")}
          style={styles.routeImage}
        />
        <View style={styles.routeContent}>
          <Text style={styles.routeTitle}>เส้นทางย้อนหลัง</Text>
        </View>

        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>อุปกรณ์</Text>
      </View>

      <View style={[styles.card, !device && styles.emptyCardMedium]}>
        {device && deviceInfo ? (
          <View style={styles.deviceRow}>
            <TouchableOpacity activeOpacity={0.85} onPress={goToPetMatch}>
              <Image source={deviceInfo.image} style={styles.deviceImg} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={goToPetMatch}>
                <Text style={styles.deviceName}>{deviceInfo.name}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={disconnectActiveDevice}>
              <View style={styles.status}>
                <View style={styles.dot} />
                <Text style={styles.statusText}>เชื่อมต่ออยู่</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCenterMedium}>
            <MaterialIcons name="devices-other" size={34} color="#D0D0D0" />
            <Text style={styles.emptyTitle}>ยังไม่มีอุปกรณ์ที่เชื่อมต่อ</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ตำแหน่งล่าสุด</Text>
      </View>

      <View style={[styles.card, { marginBottom: 32 }, !lastLocation && styles.emptyCardSmall]}>
        {locationLoading ? (
          <View style={styles.loadingLocationBox}>
            <ActivityIndicator color="#f2bb14" />
          </View>
        ) : lastLocation && matchedPet ? (
          <View style={styles.locationRow}>
            <View style={styles.petMarkerPreview}>
              {matchedPet.photoURL ? (
                <Image source={{ uri: matchedPet.photoURL }} style={styles.markerPetImg} />
              ) : (
                <MaterialIcons name="pets" size={20} color="#7A4A00" />
              )}
              <View style={styles.miniPin}>
                <Ionicons name="location-sharp" size={14} color="#fff" />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.locationText}>{districtName ?? "ไม่ทราบอำเภอ"}</Text>
              <Text style={styles.locationSubText}>{provinceName ?? "ไม่ทราบจังหวัด"}</Text>
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
          <View style={styles.emptyCenterSmall}>
            <MaterialIcons name="location-off" size={30} color="#D0D0D0" />
            <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลตำแหน่งล่าสุด</Text>
          </View>
        )}
      </View>
    </ParallaxScrollView>
  );
}