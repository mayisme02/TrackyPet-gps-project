import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from "react-native";
import MapView, { Polyline, Marker, Region, LatLng, Callout, Polygon } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/firebase";
import ProfileHeader from "@/components/ProfileHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, doc, onSnapshot } from "firebase/firestore";

/* ================= TYPES ================= */
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

  // geofence ณ เวลาบันทึก
  geofence?: GeoPoint[] | null;
  geofenceSnapshot?: { points?: GeoPoint[]; savedAt?: any } | null;

  // metrics (อาจไม่อัปเดตบางช่วง)
  distanceMeters?: number;
  durationSeconds?: number;
  exitCount?: number;

  // เวลาจริง (บันทึกจากหน้า Maps)
  startedAtIso?: string | null;
  endedAtIso?: string | null;

  // เวลาจริง (Timestamp)
  startedAt?: any;
  endedAt?: any;

  // realtime fields
  lastLiveIso?: string | null;
  lastLiveMs?: number | null;
};

/* ================= DISTANCE HELPERS (fallback) ================= */
const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineMeters = (a: LatLng, b: LatLng) => {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

// กัน GPS jump: ถ้าช่วงใดกระโดดไกลเกิน (เมตร) ไม่เอามาคิดระยะ (แต่ยังวาดเส้นตามจริง)
const MAX_SEGMENT_M = 300; // ปรับได้ (200-500)

/* ================= SCREEN ================= */
export default function RouteHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { routeId, route: routeJson } = useLocalSearchParams<{
    routeId?: string;
    route?: string;
  }>();

  const mapRef = useRef<MapView>(null);
  const startMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const endMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const suppressMapPressRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);

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

  /* ================= HELPERS ================= */
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

  const routeGeofenceSnapshot = useMemo(() => {
    const pts = route?.geofenceSnapshot?.points ?? route?.geofence ?? null;
    return normalizeGeo(pts);
  }, [route]);

  const getLatLng = (p: any): { latitude: number; longitude: number } | null => {
    const gp =
      p?.geoPoint ||
      p?.geopoint ||
      p?.coord ||
      p?.coordinate ||
      p?.location ||
      p?.position ||
      p?.point ||
      null;

    const lat =
      (typeof p?.latitude === "number" ? p.latitude : null) ??
      (typeof p?.lat === "number" ? p.lat : null) ??
      (typeof gp?.latitude === "number" ? gp.latitude : null) ??
      (typeof gp?._lat === "number" ? gp._lat : null) ??
      (typeof gp?.lat === "number" ? gp.lat : null);

    const lng =
      (typeof p?.longitude === "number" ? p.longitude : null) ??
      (typeof p?.lng === "number" ? p.lng : null) ??
      (typeof gp?.longitude === "number" ? gp.longitude : null) ??
      (typeof gp?._long === "number" ? gp._long : null) ??
      (typeof gp?.lng === "number" ? gp.lng : null);

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

    return { latitude, longitude };
  };

  const getMs = (p: any, iso: string) => {
    const ms =
      Number(p?.timestampMs) ||
      Number(p?.tsMs) ||
      (typeof p?.createdAt?.toMillis === "function" ? p.createdAt.toMillis() : 0) ||
      (iso ? Date.parse(iso) : 0) ||
      0;

    return Number.isFinite(ms) ? ms : 0;
  };

  /* ================= SUBSCRIBE ROUTE DOC ================= */
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

  /* ================= SUBSCRIBE POINTS ================= */
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!effectiveRouteId) return;

    const uid = auth.currentUser.uid;
    const colRef = collection(db, "users", uid, "routeHistories", effectiveRouteId, "points");

    return onSnapshot(
      colRef,
      (snap) => {
        const parsed = snap.docs
          .map((d) => d.data() as any)
          .map((p) => {
            const ll = getLatLng(p);
            if (!ll) return null;

            const iso =
              typeof p.timestamp === "string"
                ? p.timestamp
                : toIso(p.timestamp) || toIso(p.createdAt) || "";

            const ms = getMs(p, iso);

            return { ...ll, timestamp: iso, _ms: ms };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => (a._ms || 0) - (b._ms || 0))
          .map(({ _ms, ...rest }: any) => rest as RoutePoint);

        setPoints(parsed);
      },
      (err) => {
        console.log("points onSnapshot error:", err);
        setPoints([]);
      }
    );
  }, [effectiveRouteId]);

  /* ================= GEOFENCE SNAPSHOT ================= */
  useEffect(() => {
    if (routeGeofenceSnapshot && routeGeofenceSnapshot.length >= 3) setSavedGeofence(routeGeofenceSnapshot);
    else setSavedGeofence(null);
  }, [routeGeofenceSnapshot]);

  /* ================= LINE COORDS (always render) ================= */
  const lineCoords: LatLng[] = useMemo(() => {
    const out: LatLng[] = [];
    for (const p of points) {
      const c = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
      if (Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) continue;

      const prev = out[out.length - 1];
      if (!prev || prev.latitude !== c.latitude || prev.longitude !== c.longitude) out.push(c);
    }
    return out;
  }, [points]);

  /* ================= INITIAL REGION ================= */
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

  /* ================= FIT (fix: retry when map not ready / data late) ================= */
  const doFit = useCallback(() => {
    if (!mapRef.current) return;

    const coordsToFit: LatLng[] = [];
    if (savedGeofence && savedGeofence.length >= 3) coordsToFit.push(...savedGeofence);
    if (lineCoords.length >= 1) coordsToFit.push(...lineCoords);

    if (coordsToFit.length === 0) return;

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
  }, [lineCoords, savedGeofence, insets.top]);

  useEffect(() => {
    // ทำ 2 เฟส: เร็วๆ + retry (แก้ “ต้องกดหลายรอบถึงขึ้นเส้น”)
    const t1 = setTimeout(() => doFit(), 250);
    const t2 = setTimeout(() => doFit(), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [doFit, effectiveRouteId, mapReady]);

  /* ================= START/END + TIME RANGE ================= */
  const startPoint = points.length > 0 ? points[0] : null;
  const endPoint = points.length > 0 ? points[points.length - 1] : null;

  const status = getStatus(route);

  const startTs =
    (route?.startedAtIso ?? "") || toIso(route?.startedAt) || startPoint?.timestamp || route?.from || "";

  const endTs =
    status === "recording"
      ? route?.lastLiveIso || endPoint?.timestamp || route?.to || ""
      : (route?.endedAtIso ?? "") || toIso(route?.endedAt) || endPoint?.timestamp || route?.to || "";

  const rangeLine = useMemo(() => {
    if (startTs && endTs) return `${formatThaiDate(startTs)} • ${formatThaiTime(startTs)} - ${formatThaiTime(endTs)} น.`;
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

  /* ================= DISTANCE EFFECTIVE (fix: fallback from points) ================= */
  const distanceFromPoints = useMemo(() => {
    if (lineCoords.length < 2) return 0;

    let sum = 0;
    for (let i = 1; i < lineCoords.length; i++) {
      const d = haversineMeters(lineCoords[i - 1], lineCoords[i]);
      // กัน jump
      if (Number.isFinite(d) && d > 0 && d <= MAX_SEGMENT_M) sum += d;
    }
    return Math.round(sum);
  }, [lineCoords]);

  const distanceMetersEffective = useMemo(() => {
    const v = Number(route?.distanceMeters ?? NaN);
    if (Number.isFinite(v) && v > 0) return v;
    return distanceFromPoints; // ✅ fallback
  }, [route?.distanceMeters, distanceFromPoints]);

  const exitCountEffective = useMemo(() => {
    const v = Number(route?.exitCount ?? NaN);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [route?.exitCount]);

  const startMarkerIso = startTs || startPoint?.timestamp || "";
  const endMarkerIso = endTs || endPoint?.timestamp || "";

  /* ================= MAP INTERACTIONS ================= */
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
        <MapView
          key={effectiveRouteId} // remount เวลาเปลี่ยน routeId
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={mapOnPress}
          onMapReady={() => {
            setMapReady(true);
            // เฟสแรก fit ทันทีเมื่อ map พร้อม
            setTimeout(() => doFit(), 150);
          }}
        >
          {savedGeofence && savedGeofence.length >= 3 && (
            <Polygon
              coordinates={savedGeofence}
              strokeColor="#A100CE"
              strokeWidth={3}
              fillColor="rgba(150, 23, 185, 0.21)"
              zIndex={1}
            />
          )}

          {/* ✅ วาดเส้นทันที ไม่ต้องรอ mapReady (แก้ “กดหลายรอบถึงขึ้น”) */}
          {lineCoords.length > 1 && (
            <Polyline coordinates={lineCoords} strokeColor="#E28F00" strokeWidth={8} zIndex={5} />
          )}

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

      {/* Info ลอยทับ Map */}
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

/* ================= STYLES ================= */
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