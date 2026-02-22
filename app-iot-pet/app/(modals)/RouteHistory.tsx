import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import MapView, { Polyline, Marker, Region, LatLng } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";

type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

type RouteHistoryDoc = {
  petId: string;
  petName: string;
  photoURL?: string | null;
  deviceCode?: string;
  from: string;
  to: string;
  createdAt?: any;
};

export default function RouteHistory() {
  const router = useRouter();

  // ✅ รับได้ทั้ง routeId และ route (fallback)
  const { routeId, route: routeJson } = useLocalSearchParams<{
    routeId?: string;
    route?: string;
  }>();

  const mapRef = useRef<MapView>(null);

  // ✅ fallback จาก list (โชว์ได้ทันที)
  const fallbackRoute: (RouteHistoryDoc & { id?: string }) | null = useMemo(() => {
    if (!routeJson) return null;
    try {
      return JSON.parse(routeJson);
    } catch {
      return null;
    }
  }, [routeJson]);

  const [route, setRoute] = useState<(RouteHistoryDoc & { id: string }) | null>(
    fallbackRoute && fallbackRoute.id
      ? ({ id: fallbackRoute.id, ...(fallbackRoute as RouteHistoryDoc) } as any)
      : null
  );

  const [points, setPoints] = useState<RoutePoint[]>([]);

  const formatThaiDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatThaiTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const rangeText = useMemo(() => {
    if (!route) return "";
    const sameDay =
      new Date(route.from).toDateString() === new Date(route.to).toDateString();

    if (sameDay) {
      return `${formatThaiDate(route.from)} • ${formatThaiTime(
        route.from
      )} - ${formatThaiTime(route.to)} น.`;
    }

    return `${formatThaiDate(route.from)} ${formatThaiTime(
      route.from
    )} น.\nถึง ${formatThaiDate(route.to)} ${formatThaiTime(route.to)} น.`;
  }, [route]);

  const effectiveRouteId = routeId || (fallbackRoute as any)?.id;

  // ✅ โหลด route doc เพื่อให้ข้อมูลล่าสุดแน่นอน
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!effectiveRouteId) return;

    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "routeHistories", effectiveRouteId);

    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setRoute(null);
        return;
      }
      setRoute({ id: snap.id, ...(snap.data() as RouteHistoryDoc) });
    });
  }, [effectiveRouteId]);

  // ✅ โหลด points จาก subcollection
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!effectiveRouteId) return;

    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "routeHistories", effectiveRouteId, "points"),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as RoutePoint);
      setPoints(data);
    });
  }, [effectiveRouteId]);

  const lineCoords: LatLng[] = useMemo(
    () => points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [points]
  );

  const initialRegion: Region = useMemo(() => {
    if (points.length > 0) {
      return {
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: 16.4755,
      longitude: 102.825,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [points]);

  // ✅ fit map เมื่อมีเส้น
  useEffect(() => {
    if (!mapRef.current) return;
    if (lineCoords.length < 2) return;

    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(lineCoords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(t);
  }, [lineCoords]);

  const H = Dimensions.get("window").height;
  const mapHeight = Math.min(520, H * 0.52); // ✅ ใกล้ดีไซน์ (map ใหญ่ขึ้น)

  const start = points.length > 0 ? points[0] : null;
  const end = points.length > 0 ? points[points.length - 1] : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ProfileHeader
        title="ประวัติเส้นทางย้อนหลัง"
        left={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.mapWrap, { height: mapHeight }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
        >
          {lineCoords.length > 1 && (
            <Polyline coordinates={lineCoords} strokeColor="#C59700" strokeWidth={8} />
          )}

          {start && (
            <Marker
              coordinate={{ latitude: start.latitude, longitude: start.longitude }}
              title="เริ่มต้น"
            >
              <MaterialIcons name="location-on" size={26} color="#16a34a" />
            </Marker>
          )}

          {end && (
            <Marker
              coordinate={{ latitude: end.latitude, longitude: end.longitude }}
              title="สิ้นสุด"
            >
              <MaterialIcons name="flag" size={24} color="#dc2626" />
            </Marker>
          )}
        </MapView>
      </View>

      <View style={styles.card}>
        <Text style={styles.timeTitle}>
          {route ? `${formatThaiTime(route.from)} - ${formatThaiTime(route.to)} น.` : "-"}
        </Text>

        <View style={styles.row}>
          {route?.photoURL ? (
            <Image source={{ uri: route.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={26} color="#9CA3AF" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.petName}>{route?.petName ?? "-"}</Text>
            <Text style={styles.range}>{route ? rangeText : ""}</Text>

            <Text style={styles.meta}>
              {points.length > 0 ? `จุดเส้นทาง: ${points.length} จุด` : "ไม่มีข้อมูลเส้นทาง"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  timeTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  avatar: { width: 56, height: 56, borderRadius: 28 },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2F7",
    justifyContent: "center",
    alignItems: "center",
  },

  petName: { fontSize: 15.5, fontWeight: "900", color: "#111827" },
  range: { marginTop: 2, fontSize: 13.5, color: "#6B7280", fontWeight: "700", lineHeight: 18 },
  meta: { marginTop: 6, fontSize: 12.5, color: "#9CA3AF", fontWeight: "700" },
});