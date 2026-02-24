import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Polyline, Marker, Region, LatLng, Callout } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";

type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO
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
  const { routeId, route: routeJson } = useLocalSearchParams<{
    routeId?: string;
    route?: string;
  }>();

  const mapRef = useRef<MapView>(null);

  // ✅ กัน MapView.onPress ปิดทันทีหลังแตะ marker
  const suppressMapPressRef = useRef(false);

  const startMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const endMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);

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

  const effectiveRouteId = routeId || (fallbackRoute as any)?.id;

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
  const mapHeight = Math.min(520, H * 0.52);

  const start = points.length > 0 ? points[0] : null;
  const end = points.length > 0 ? points[points.length - 1] : null;

  // ✅ เวลาจริงจาก points (สำคัญ)
  const startTs = start?.timestamp ?? null;
  const endTs = end?.timestamp ?? null;

  const topTimeTitle = useMemo(() => {
    if (startTs && endTs) return `${formatThaiTime(startTs)} - ${formatThaiTime(endTs)} น.`;
    if (route) return `${formatThaiTime(route.from)} - ${formatThaiTime(route.to)} น.`;
    return "-";
  }, [startTs, endTs, route]);

  const topRangeLine = useMemo(() => {
    if (startTs && endTs) return `${formatThaiDate(startTs)} • ${formatThaiTime(startTs)} - ${formatThaiTime(endTs)} น.`;
    if (route)
      return `${formatThaiDate(route.from)} • ${formatThaiTime(route.from)} - ${formatThaiTime(route.to)} น.`;
    return "";
  }, [startTs, endTs, route]);

  const mapOnPress = () => {
    // ✅ ถ้าเพิ่งกด marker มา ให้ปล่อยผ่าน ไม่ต้องทำอะไร
    if (suppressMapPressRef.current) {
      return;
    }
    // ถ้าจะทำอะไรตอนแตะแผนที่ (เช่น hideCallout) ทำได้ แต่ไม่จำเป็น
    startMarkerRef.current?.hideCallout?.();
    endMarkerRef.current?.hideCallout?.();
  };

  const onPressStartMarker = () => {
    if (!start) return;
    suppressMapPressRef.current = true;

    startMarkerRef.current?.showCallout?.();

    // ปลดล็อกหลังจาก event loop
    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 250);
  };

  const onPressEndMarker = () => {
    if (!end) return;
    suppressMapPressRef.current = true;

    endMarkerRef.current?.showCallout?.();

    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 250);
  };

  // ✅ UI callout สไตล์เดียวกับ MapTracker (เหมือน Maps)
  const InfoCallout = ({
    title,
    badge,
    dateIso,
    timeIso,
    color,
    coords,
  }: {
    title: string;
    badge: string;
    dateIso: string | null;
    timeIso: string | null;
    color: string;
    coords: { latitude: number; longitude: number } | null;
  }) => {
    const dateText = dateIso ? formatThaiDate(dateIso) : "-";
    const timeText = timeIso ? formatThaiTime(timeIso) : "-";
    const coordText =
      coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : "-";

    return (
      <View style={styles.calloutWrapper}>
        <View style={styles.calloutHandle} />
        <View style={styles.calloutCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={[styles.badge, { backgroundColor: color + "22" }]}>
              <Text style={[styles.badgeText, { color }]}>{badge}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowLine}>
            <Text style={styles.icon}>📅</Text>
            <Text style={styles.text}>{dateText}</Text>
          </View>

          <View style={styles.rowLine}>
            <Text style={styles.icon}>🕒</Text>
            <Text style={styles.text}>{timeText} น.</Text>
          </View>

          <View style={styles.rowLine}>
            <Text style={styles.icon}>📍</Text>
            <Text style={styles.monoText}>{coordText}</Text>
          </View>
        </View>
      </View>
    );
  };

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
          onPress={mapOnPress}
        >
          {lineCoords.length > 1 && (
            <Polyline coordinates={lineCoords} strokeColor="#D19806" strokeWidth={8} />
          )}

          {start && (
            <Marker
              ref={startMarkerRef}
              coordinate={{ latitude: start.latitude, longitude: start.longitude }}
              onPress={onPressStartMarker}
              anchor={{ x: 0, y: 0 }} // ให้ปลายหมุดแตะพื้น
            >
              <Image
                source={require("../../assets/images/location.png")}
                style={styles.mapPin}
                resizeMode="contain"
              />

              <Callout tooltip>
                <InfoCallout
                  title="เริ่มบันทึก"
                  badge="เริ่มต้น"
                  dateIso={startTs}
                  timeIso={startTs}
                  color="#16a34a"
                  coords={{ latitude: start.latitude, longitude: start.longitude }}
                />
              </Callout>
            </Marker>
          )}

          {end && (
            <Marker
              ref={endMarkerRef}
              coordinate={{ latitude: end.latitude, longitude: end.longitude }}
              onPress={onPressEndMarker}
              anchor={{ x: 0, y: 20 }}
            >
              <Image
                source={require("../../assets/images/flag.png")}
                style={styles.mapPin}
                resizeMode="contain"
              />

              <Callout tooltip>
                <InfoCallout
                  title="สิ้นสุด"
                  badge="สิ้นสุด"
                  dateIso={endTs}
                  timeIso={endTs}
                  color="#dc2626"
                  coords={{ latitude: end.latitude, longitude: end.longitude }}
                />
              </Callout>
            </Marker>
          )}
        </MapView>
      </View>

      {/* ===== INFO CARD ===== */}
      <View style={styles.bottomCard}>
        <Text style={styles.timeTitle}>{topTimeTitle}</Text>

        <View style={styles.bottomRow}>
          {route?.photoURL ? (
            <Image source={{ uri: route.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={26} color="#9CA3AF" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.petName}>{route?.petName ?? "-"}</Text>
            <Text style={styles.range}>{topRangeLine}</Text>

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

  // ===== Callout (เหมือน Maps) =====
  calloutWrapper: {
    alignItems: "center",
  },
  calloutHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  calloutCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 10,
  },
  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    fontSize: 14.5,
    color: "#333",
    fontWeight: "700",
  },
  monoText: {
    fontSize: 14,
    color: "#444",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },

  bottomCard: {
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
  bottomRow: {
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
  range: {
    marginTop: 2,
    fontSize: 13.5,
    color: "#6B7280",
    fontWeight: "700",
    lineHeight: 18,
  },
  meta: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#9CA3AF",
    fontWeight: "700"
  },
  mapPin: {
    width: 28,
    height: 28,
  },
});