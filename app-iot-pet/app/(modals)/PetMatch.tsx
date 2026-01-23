import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebase";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    getDocs,
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DEVICE_TYPES } from "../../assets/constants/deviceData";

/* =====================
   CONSTANTS
====================== */
const AVATAR_SIZE = 48;
const ROW_HEIGHT = 64;
const CARD_PADDING = 16;
const ACTIVE_INSET = 8;

type UserDevice = {
    id: string;
    code: string;
    type?: string;
    name: string;
};

type Pet = {
    id: string;
    name: string;
    photoURL?: string;
};

export default function PetMatch() {
    const router = useRouter();
    const { device } = useLocalSearchParams();
    const parsedDevice: UserDevice = JSON.parse(device as string);

    const deviceType =
        (parsedDevice.type && DEVICE_TYPES[parsedDevice.type]) ||
        DEVICE_TYPES["GPS_TRACKER_A7670"];

    const [pets, setPets] = useState<Pet[]>([]);
    const [currentMatch, setCurrentMatch] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        return onSnapshot(
            query(collection(db, "users", uid, "pets"), orderBy("createdAt", "asc")),
            (snap) =>
                setPets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
    }, []);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        return onSnapshot(
            doc(db, "users", uid, "deviceMatches", parsedDevice.code),
            (snap) => setCurrentMatch(snap.exists() ? snap.data() : null)
        );
    }, []);

    const petAlreadyUsed = async (petId: string) => {
        const uid = auth.currentUser!.uid;
        const snap = await getDocs(
            collection(db, "users", uid, "deviceMatches")
        );

        return snap.docs.some(
            (d) => d.data().petId === petId && d.id !== parsedDevice.code
        );
    };

    const onSelectPet = async (pet: Pet) => {
        if (currentMatch?.petId === pet.id) return;

        if (await petAlreadyUsed(pet.id)) {
            Alert.alert("ไม่สามารถเชื่อมต่อ", "สัตว์เลี้ยงนี้ถูกใช้งานแล้ว");
            return;
        }

        Alert.alert(
            "ยืนยันการเชื่อมต่อ",
            `เชื่อมต่อ ${parsedDevice.name} กับ ${pet.name}?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ยืนยัน",
                    onPress: async () => {
                        const uid = auth.currentUser!.uid;
                        await setDoc(
                            doc(db, "users", uid, "deviceMatches", parsedDevice.code),
                            {
                                deviceCode: parsedDevice.code,
                                deviceType: parsedDevice.type ?? "GPS_TRACKER_A7670",
                                deviceName: parsedDevice.name,
                                petId: pet.id,
                                petName: pet.name,
                                photoURL: pet.photoURL || null,
                                status: "CONNECTED",
                                updatedAt: serverTimestamp(),
                            }
                        );
                    },
                },
            ]
        );
    };

    const onPressStatus = () => {
        if (!currentMatch) return;

        Alert.alert(
            "ยกเลิกการเชื่อมต่อ",
            `ต้องการยกเลิกการเชื่อมต่อกับ ${currentMatch.petName} หรือไม่?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ยืนยัน",
                    style: "destructive",
                    onPress: async () => {
                        const uid = auth.currentUser!.uid;
                        await deleteDoc(
                            doc(db, "users", uid, "deviceMatches", parsedDevice.code)
                        );
                    },
                },
            ]
        );
    };

    return (
        <>
            {/* ===== HEADER ===== */}
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>รายละเอียดอุปกรณ์</Text>
                    <View style={{ width: 28 }} />
                </View>
            </SafeAreaView>

            <View style={styles.container}>
                {/* ===== DEVICE CARD ===== */}
                <View style={styles.card}>
                    <View style={styles.deviceTop}>
                        <Image
                            source={{ uri: deviceType.image.uri }}
                            style={styles.deviceImage}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.deviceName}>{parsedDevice.name}</Text>
                            <Text style={styles.deviceDesc}>
                                {deviceType.description}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.deviceBottom}>
                        <View style={styles.petRow}>
                            {currentMatch?.photoURL ? (
                                <Image
                                    source={{ uri: currentMatch.photoURL }}
                                    style={styles.petAvatar}
                                />
                            ) : (
                                <View style={styles.petAvatarEmpty}>
                                    <MaterialIcons name="pets" size={22} color="#9CA3AF" />
                                </View>
                            )}
                            <Text style={styles.petName}>
                                {currentMatch?.petName ?? "ว่าง"}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={currentMatch ? onPressStatus : undefined}>
                            <View
                                style={[
                                    styles.statusPill,
                                    !currentMatch && styles.statusPillInactive,
                                ]}
                            >
                                {/* <View
                                    style={[
                                        styles.statusDot,
                                        !currentMatch && styles.statusDotInactive,
                                    ]}
                                /> */}
                                <Text
                                    style={[
                                        styles.statusText,
                                        !currentMatch && styles.statusTextInactive,
                                    ]}
                                >
                                    {currentMatch ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ===== PET CARD ===== */}
                <Text style={styles.sectionTitle}>เลือกสัตว์เลี้ยง</Text>
                <View style={styles.card}>
                    {pets.map((item, index) => {
                        const active = currentMatch?.petId === item.id;
                        const isLast = index === pets.length - 1;

                        return (
                            <View key={item.id}>
                                <TouchableOpacity
                                    disabled={active}
                                    onPress={() => onSelectPet(item)}
                                    style={[
                                        styles.petItem,
                                        active && styles.petItemActive,
                                    ]}
                                >
                                    <View style={styles.petRow}>
                                        {item.photoURL ? (
                                            <Image
                                                source={{ uri: item.photoURL }}
                                                style={styles.petAvatar}
                                            />
                                        ) : (
                                            <View style={styles.petAvatarEmpty}>
                                                <MaterialIcons name="pets" size={22} color="#9CA3AF" />
                                            </View>
                                        )}
                                        <Text style={styles.petItemName}>{item.name}</Text>
                                    </View>

                                    {active && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={24}
                                            color="#009B4B"
                                        />
                                    )}
                                </TouchableOpacity>

                                {!isLast && <View style={styles.petDivider} />}
                            </View>
                        );
                    })}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { backgroundColor: "#f2bb14" },

    header: {
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },

    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#F7F8FA",
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: CARD_PADDING,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },

    /* Device */
    deviceTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    deviceImage: {
        width: 72,
        height: 72,
        borderRadius: 16,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    deviceDesc: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginVertical: 14,
    },
    deviceBottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    /* Pet */
    petRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    petAvatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    petAvatarEmpty: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    petName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },

    petItem: {
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    petItemActive: {
        backgroundColor: "#F9FFFC",
        borderWidth: 0.5,
        borderRadius: 12,
        borderColor: "#009B4B",
        marginHorizontal: -(CARD_PADDING - ACTIVE_INSET),
        paddingHorizontal: CARD_PADDING - ACTIVE_INSET,
    },

    petItemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },

    petDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#E5E7EB",
        marginLeft: AVATAR_SIZE + 12,
    },

    /* Status */
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#009B4B",
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusPillInactive: {
        backgroundColor: "#F1F5F9",
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ffffff",
        marginRight: 6,
    },
    statusDotInactive: {
        backgroundColor: "#9CA3AF",
    },
    statusText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#ffffff",
    },
    statusTextInactive: {
        color: "#6B7280",
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 12,
        color: "#111827",
    },
});