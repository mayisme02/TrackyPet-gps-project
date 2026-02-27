import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from "react-native";
import MapView, { Polyline, Marker, Region, LatLng, Callout, Polygon } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import ProfileHeader from "@/components/ProfileHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO string
};

type GeoPoint = { latitude: number; longitude: number };

type RouteHistoryDoc = {
  petId: string;
  petName: string;
  photoURL?: string | null;
  deviceCode?: string;

  from: string; // ISO (planned)
  to: string; // ISO (planned)
  createdAt?: any;

  status?: string;

  // ✅ geofence ณ เวลาบันทึก
  geofence?: GeoPoint[] | null;
  geofenceSnapshot?: { points?: GeoPoint[]; savedAt?: any } | null;

  // ✅ metrics
  distanceMeters?: number;
  durationSeconds?: number;
  exitCount?: number;

  // ✅ เวลาจริง (บันทึกจากหน้า Maps)
  startedAtIso?: string | null;
  endedAtIso?: string | null;

  // ✅ เวลาจริง (Timestamp) เผื่อบางเครื่องเก็บเป็น Firestore Timestamp
  startedAt?: any; // Firestore Timestamp
  endedAt?: any; // Firestore Timestamp

  // ✅ realtime fields
  lastLiveIso?: string | null;
  lastLiveMs?: number | null;
};

export default function RouteHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { routeId, route: routeJson } = useLocalSearchParams<{
    routeId?: string;
    route?: string;
  }>();

  const mapRef = useRef<MapView>(null);
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
    fallbackRoute && (fallbackRoute as any).id
      ? ({ id: (fallbackRoute as any).id, ...(fallbackRoute as RouteHistoryDoc) } as any)
      : null
  );

  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [savedGeofence, setSavedGeofence] = useState<GeoPoint[] | null>(null);

  const effectiveRouteId = routeId || (fallbackRoute as any)?.id;

  // ---------- helpers ----------
  const normalizeGeo = (poly: any): GeoPoint[] | null => {
    if (!Array.isArray(poly) || poly.length < 3) return null;
    const cleaned = poly
      .map((p: any) => ({
        latitude: Number(p?.latitude ?? p?.lat),
        longitude: Number(p?.longitude ?? p?.lng),
      }))
      .filter(
        (p: any) =>
          Number.isFinite(p.latitude) &&
          Number.isFinite(p.longitude) &&
          Math.abs(p.latitude) <= 90 &&
          Math.abs(p.longitude) <= 180
      );
    return cleaned.length >= 3 ? cleaned : null;
  };

  const toIso = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    return "";
  };

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

  const formatDistance = (m?: number) => {
    const meters = Number(m ?? 0);
    if (!Number.isFinite(meters) || meters <= 0) return "0 ม.";
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} กม.`;
    return `${Math.round(meters)} ม.`;
  };

  const formatDuration = (sec?: number) => {
    const s = Number(sec ?? 0);
    if (!Number.isFinite(s) || s <= 0) return "0 นาที";
    return `${Math.round(s / 60)} นาที`;
  };

  const getStatus = (r?: RouteHistoryDoc | null) => {
    const s = (r?.status ?? "").toString().trim().toLowerCase();
    return s === "recording" || s === "running" || s === "in_progress" ? "recording" : "done";
  };

  // ✅ use record-time geofence snapshot first, then fallback to geofence
  const routeGeofenceSnapshot = useMemo(() => {
    const pts = route?.geofenceSnapshot?.points ?? route?.geofence ?? null;
    return normalizeGeo(pts);
  }, [route]);

  // ---------- subscribe route doc ----------
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!effectiveRouteId) return;

    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "routeHistories", effectiveRouteId);

    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoute(null);
          return;
        }
        setRoute({ id: snap.id, ...(snap.data() as RouteHistoryDoc) });
      },
      (err) => console.log("route doc onSnapshot error:", err)
    );
  }, [effectiveRouteId]);

  // ---------- subscribe points (NO orderBy; sort client to avoid index/field issues) ----------
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!effectiveRouteId) return;

    const uid = auth.currentUser.uid;
    const colRef = collection(db, "users", uid, "routeHistories", effectiveRouteId, "points");

    const pickNumber = (...vals: any[]) => {
      for (const v of vals) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return NaN;
    };

    return onSnapshot(
      colRef,
      (snap) => {
        const parsed = snap.docs
          .map((d) => d.data() as any)
          .map((p) => {
            const lat = pickNumber(
              p.latitude,
              p.lat,
              p.coord?.latitude,
              p.coord?.lat,
              p.coordinate?.latitude,
              p.coordinate?.lat,
              p.location?.latitude,
              p.location?.lat
            );

            const lng = pickNumber(
              p.longitude,
              p.lng,
              p.coord?.longitude,
              p.coord?.lng,
              p.coordinate?.longitude,
              p.coordinate?.lng,
              p.location?.longitude,
              p.location?.lng
            );

            const iso =
              typeof p.timestamp === "string" ? p.timestamp : toIso(p.timestamp) || toIso(p.createdAt) || "";

            const ms = pickNumber(p.timestampMs, p.tsMs, Date.parse(iso) || 0);

            return { latitude: lat, longitude: lng, timestamp: iso, _ms: ms };
          })
          .filter(
            (p) =>
              Number.isFinite(p.latitude) &&
              Number.isFinite(p.longitude) &&
              Math.abs(p.latitude) <= 90 &&
              Math.abs(p.longitude) <= 180
          )
          .sort((a, b) => a._ms - b._ms)
          .map(({ _ms, ...rest }) => rest as RoutePoint);

        setPoints(parsed);
      },
      (err) => {
        console.log("points onSnapshot error:", err);
        setPoints([]);
      }
    );
  }, [effectiveRouteId]);

  useEffect(() => {
    if (routeGeofenceSnapshot && routeGeofenceSnapshot.length >= 3) setSavedGeofence(routeGeofenceSnapshot);
    else setSavedGeofence(null);
  }, [routeGeofenceSnapshot]);

  const lineCoords: LatLng[] = useMemo(
    () =>
      points
        .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
        .filter(
          (p) =>
            Number.isFinite(p.latitude) &&
            Number.isFinite(p.longitude) &&
            Math.abs(p.latitude) <= 90 &&
            Math.abs(p.longitude) <= 180
        ),
    [points]
  );

  const initialRegion: Region = useMemo(() => {
    if (lineCoords.length > 0) {
      return {
        latitude: lineCoords[0].latitude,
        longitude: lineCoords[0].longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    if (savedGeofence && savedGeofence.length >= 3) {
      return {
        latitude: savedGeofence[0].latitude,
        longitude: savedGeofence[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 16.4755,
      longitude: 102.825,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [lineCoords, savedGeofence]);

  // ✅ fit ให้ครอบคลุม “เส้นทาง + geofence”
  useEffect(() => {
    if (!mapRef.current) return;

    const coordsToFit: LatLng[] = [];
    if (savedGeofence && savedGeofence.length >= 3) coordsToFit.push(...savedGeofence);
    if (lineCoords.length >= 1) coordsToFit.push(...lineCoords);

    if (coordsToFit.length === 0) return;

    const t = setTimeout(() => {
      if (coordsToFit.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: coordsToFit[0].latitude,
            longitude: coordsToFit[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          350
        );
        return;
      }

      mapRef.current?.fitToCoordinates(coordsToFit, {
        edgePadding: {
          top: 90 + insets.top,
          right: 60,
          bottom: 60,
          left: 60,
        },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(t);
  }, [lineCoords, savedGeofence, insets.top]);

  const startPoint = points.length > 0 ? points[0] : null;
  const endPoint = points.length > 0 ? points[points.length - 1] : null;

  const status = getStatus(route);

  /**
   * ✅ เวลาแสดง “อิงเวลาจริงจาก Maps ก่อน”:
   * start = route.startedAtIso > route.startedAt(TS) > point แรก > route.from(planned)
   * end   = (recording) route.lastLiveIso > point สุดท้าย > route.to(planned)
   *        (done)       route.endedAtIso > route.endedAt(TS) > point สุดท้าย > route.to(planned)
   */
  const startTs =
    (route?.startedAtIso ?? "") ||
    toIso(route?.startedAt) ||
    startPoint?.timestamp ||
    route?.from ||
    "";

  const endTs =
    status === "recording"
      ? route?.lastLiveIso || endPoint?.timestamp || route?.to || ""
      : (route?.endedAtIso ?? "") || toIso(route?.endedAt) || endPoint?.timestamp || route?.to || "";

  const rangeLine = useMemo(() => {
    if (startTs && endTs) {
      return `${formatThaiDate(startTs)} • ${formatThaiTime(startTs)} - ${formatThaiTime(endTs)} น.`;
    }
    return "-";
  }, [startTs, endTs]);

  const durationSecEffective = useMemo(() => {
    const v = Number(route?.durationSeconds ?? NaN);
    if (Number.isFinite(v) && v >= 0) return v;

    if (startTs && endTs) {
      const ms = Date.parse(endTs) - Date.parse(startTs);
      return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : 0;
    }
    return 0;
  }, [route?.durationSeconds, startTs, endTs]);

  const distanceMetersEffective = useMemo(() => {
    const v = Number(route?.distanceMeters ?? NaN);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [route?.distanceMeters]);

  const exitCountEffective = useMemo(() => {
    const v = Number(route?.exitCount ?? NaN);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [route?.exitCount]);

  // ✅ เวลาที่จะโชว์ใน callout ของ marker (ให้ตรงกับเวลาจริง)
  const startMarkerIso = startTs || startPoint?.timestamp || "";
  const endMarkerIso = endTs || endPoint?.timestamp || "";

  // ---------- map interactions ----------
  const mapOnPress = () => {
    if (suppressMapPressRef.current) return;
    suppressMapPressRef.current = false;
    startMarkerRef.current?.hideCallout?.();
    endMarkerRef.current?.hideCallout?.();
  };

  const onPressStartMarker = () => {
    if (!startPoint) return;
    suppressMapPressRef.current = true;
    startMarkerRef.current?.showCallout?.();
    setTimeout(() => (suppressMapPressRef.current = false), 250);
  };

  const onPressEndMarker = () => {
    if (!endPoint) return;
    suppressMapPressRef.current = true;
    endMarkerRef.current?.showCallout?.();
    setTimeout(() => (suppressMapPressRef.current = false), 250);
  };

  const InfoCallout = ({
    title,
    badge,
    iso,
    color,
    coords,
  }: {
    title: string;
    badge: string;
    iso: string | null;
    color: string;
    coords: { latitude: number; longitude: number } | null;
  }) => {
    const dateText = iso ? formatThaiDate(iso) : "-";
    const timeText = iso ? formatThaiTime(iso) : "-";
    const coordText = coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : "-";

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

  const HEADER_H = 56 + insets.top;
  const INFO_BOTTOM = 24 + Math.min(insets.bottom, 8);

  return (
    <View style={styles.screen}>
      {/* Header overlay */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <ProfileHeader
          title="เส้นทางย้อนหลัง"
          left={
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color="#000" />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Map เต็มพื้นที่ใต้ header */}
      <View style={[styles.mapWrap, { marginTop: HEADER_H }]}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} onPress={mapOnPress}>
          {savedGeofence && savedGeofence.length >= 3 && (
            <Polygon
              coordinates={savedGeofence}
              strokeColor="#A100CE"
              strokeWidth={3}
              fillColor="rgba(150, 23, 185, 0.21)"
              zIndex={1}
            />
          )}

          {lineCoords.length > 1 && <Polyline coordinates={lineCoords} strokeColor="#E28F00" strokeWidth={8} zIndex={5} />}

          {startPoint && (
            <Marker
              ref={startMarkerRef}
              coordinate={{ latitude: startPoint.latitude, longitude: startPoint.longitude }}
              onPress={onPressStartMarker}
              anchor={{ x: 0.5, y: 1 }}
            >
              <Image source={require("../../assets/images/location.png")} style={styles.mapPin} resizeMode="contain" />
              <Callout tooltip>
                <InfoCallout
                  title="เริ่มบันทึก"
                  badge="เริ่มต้น"
                  iso={startMarkerIso || null}
                  color="#16a34a"
                  coords={{ latitude: startPoint.latitude, longitude: startPoint.longitude }}
                />
              </Callout>
            </Marker>
          )}

          {endPoint && (
            <Marker
              ref={endMarkerRef}
              coordinate={{ latitude: endPoint.latitude, longitude: endPoint.longitude }}
              onPress={onPressEndMarker}
              anchor={{ x: 0.5, y: 1 }}
            >
              <Image source={require("../../assets/images/flag.png")} style={styles.mapPin} resizeMode="contain" />
              <Callout tooltip>
                <InfoCallout
                  title="สิ้นสุด"
                  badge={status === "recording" ? "ล่าสุด" : "สิ้นสุด"}
                  iso={endMarkerIso || null}
                  color={status === "recording" ? "#0ea5e9" : "#dc2626"}
                  coords={{ latitude: endPoint.latitude, longitude: endPoint.longitude }}
                />
              </Callout>
            </Marker>
          )}
        </MapView>
      </View>

      {/* ✅ Info ลอยทับ Map */}
      <View style={[styles.infoSection, { position: "absolute", left: 16, right: 16, bottom: INFO_BOTTOM }]}>
        <View style={styles.topRow}>
          {route?.photoURL ? (
            <Image source={{ uri: route.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={26} color="#9CA3AF" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.petName}>{route?.petName ?? "-"}</Text>
            <Text style={styles.range}>{rangeLine}</Text>

            <Text style={styles.subMeta}>
              {status === "recording"
                ? `กำลังบันทึก • อัปเดทล่าสุด ${route?.lastLiveIso ? formatThaiTime(route.lastLiveIso) + " น." : "-"}`
                : points.length > 0
                ? `จุดเส้นทาง ${points.length} จุด`
                : "ไม่มีข้อมูลเส้นทาง"}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Image source={require("../../assets/images/way.png")} style={styles.metricIconTop} resizeMode="contain" />
            <Text style={styles.metricLabel}>ระยะทาง</Text>
            <Text style={styles.metricValue}>{formatDistance(distanceMetersEffective)}</Text>
          </View>

          <View style={styles.metricItem}>
            <Image source={require("../../assets/images/clock.png")} style={styles.metricIconTop} resizeMode="contain" />
            <Text style={styles.metricLabel}>เวลาเดิน</Text>
            <Text style={styles.metricValue}>{formatDuration(durationSecEffective)}</Text>
          </View>

          <View style={styles.metricItem}>
            <Image source={require("../../assets/images/warning.png")} style={styles.metricIconTop} resizeMode="contain" />
            <Text style={styles.metricLabel}>ออกนอกพื้นที่</Text>
            <Text style={styles.metricValue}>{exitCountEffective} ครั้ง</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },

  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
  },

  mapWrap: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },

  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  topRow: { flexDirection: "row", gap: 12, alignItems: "center" },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 40,
  },

  placeholder: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "#EEF2F7",
    justifyContent: "center",
    alignItems: "center",
  },

  petName: { fontSize: 20, fontWeight: "800", color: "#111827" },

  range: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    lineHeight: 18,
  },

  subMeta: { marginTop: 4, fontSize: 13, color: "#6B7280", fontWeight: "700" },

  metricsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  metricItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",

    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  metricIconTop: { width: 22, height: 22, marginBottom: 8 },

  metricLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },

  metricValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "900",
    textAlign: "center",
  },

  // Callout
  calloutWrapper: { alignItems: "center" },
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
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  rowLine: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  icon: { fontSize: 16, marginRight: 8 },
  text: { fontSize: 14.5, color: "#333", fontWeight: "700" },
  monoText: {
    fontSize: 14,
    color: "#444",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },

  mapPin: { width: 28, height: 28 },
});