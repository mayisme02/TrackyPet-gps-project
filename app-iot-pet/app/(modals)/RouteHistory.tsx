import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Easing,
} from "react-native";
import MapView, {
  Polyline,
  Marker,
  Region,
  LatLng,
  Callout,
  Polygon,
  AnimatedRegion,
} from "react-native-maps";
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
  timestamp: string;
};

type GeoPoint = { latitude: number; longitude: number };

type RouteHistoryDoc = {
  petId: string;
  petName: string;
  photoURL?: string | null;
  deviceCode?: string;

  from: string;
  to: string;
  createdAt?: any;

  status?: string;

  geofence?: GeoPoint[] | null;
  geofenceSnapshot?: { points?: GeoPoint[]; savedAt?: any } | null;

  distanceMeters?: number;
  durationSeconds?: number;
  exitCount?: number;

  startedAtIso?: string | null;
  endedAtIso?: string | null;

  startedAt?: any;
  endedAt?: any;

  lastLiveIso?: string | null;
  lastLiveMs?: number | null;
};

type PetProfile = {
  id: string;
  name?: string;
  photoURL?: string | null;
  breed?: string;
  age?: string;
  weight?: string;
  height?: string;
  gender?: string;
};

type DirectionMarker = {
  key: string;
  coordinate: LatLng;
  rotation: number;
};

/* ================= DISTANCE HELPERS ================= */
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

const bearingDegrees = (a: LatLng, b: LatLng) => {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const MAX_SEGMENT_M = 300;
const MIN_DIRECTION_GAP_METERS = 80;

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

  const animatedMarkerRef = useRef<React.ElementRef<typeof Marker> | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
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

  /* ================= DISPLAY PET INFO ================= */
  const displayPetName = petProfile?.name || route?.petName || fallbackRoute?.petName || "-";
  const displayPhoto = petProfile?.photoURL || route?.photoURL || fallbackRoute?.photoURL || "";

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

  /* ================= SUBSCRIBE PET DOC ================= */
  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const effectivePetId = route?.petId || fallbackRoute?.petId || null;

    if (!effectivePetId) {
      setPetProfile(null);
      return;
    }

    const petRef = doc(db, "users", uid, "pets", effectivePetId);

    return onSnapshot(
      petRef,
      (snap) => {
        if (!snap.exists()) {
          setPetProfile(null);
          return;
        }

        const data = snap.data() as Omit<PetProfile, "id">;
        setPetProfile({
          id: snap.id,
          ...data,
        });
      },
      (err) => {
        console.log("pet doc onSnapshot error:", err);
        setPetProfile(null);
      }
    );
  }, [route?.petId, fallbackRoute?.petId]);

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

  /* ================= LINE COORDS ================= */
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

  /* ================= DIRECTION MARKERS ================= */
  const directionMarkers: DirectionMarker[] = useMemo(() => {
    if (lineCoords.length < 2) return [];

    const markers: DirectionMarker[] = [];
    let accumulated = 0;

    for (let i = 1; i < lineCoords.length; i++) {
      const prev = lineCoords[i - 1];
      const curr = lineCoords[i];

      const segDist = haversineMeters(prev, curr);
      if (!Number.isFinite(segDist) || segDist < 8 || segDist > MAX_SEGMENT_M) continue;

      accumulated += segDist;

      if (accumulated >= MIN_DIRECTION_GAP_METERS) {
        markers.push({
          key: `dir-${i}`,
          coordinate: {
            latitude: (prev.latitude + curr.latitude) / 2,
            longitude: (prev.longitude + curr.longitude) / 2,
          },
          rotation: bearingDegrees(prev, curr),
        });

        accumulated = 0;
      }
    }

    return markers;
  }, [lineCoords]);

  /* ================= START / END ================= */
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

  const distanceFromPoints = useMemo(() => {
    if (lineCoords.length < 2) return 0;

    let sum = 0;
    for (let i = 1; i < lineCoords.length; i++) {
      const d = haversineMeters(lineCoords[i - 1], lineCoords[i]);
      if (Number.isFinite(d) && d > 0 && d <= MAX_SEGMENT_M) sum += d;
    }
    return Math.round(sum);
  }, [lineCoords]);

  const distanceMetersEffective = useMemo(() => {
    const v = Number(route?.distanceMeters ?? NaN);
    if (Number.isFinite(v) && v > 0) return v;
    return distanceFromPoints;
  }, [route?.distanceMeters, distanceFromPoints]);

  const exitCountEffective = useMemo(() => {
    const v = Number(route?.exitCount ?? NaN);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [route?.exitCount]);

  const startMarkerIso = startTs || startPoint?.timestamp || "";
  const endMarkerIso = endTs || endPoint?.timestamp || "";

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

  /* ================= ANIMATION ================= */
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
    })
  ).current;

  const animatedRotation = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const animatedInverseRotation = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  const animateRotation = useCallback(
    (toValue: number) => {
      Animated.timing(rotationAnim, {
        toValue,
        duration: 350,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    },
    [rotationAnim]
  );

  const getSegmentDuration = useCallback((from: LatLng, to: LatLng) => {
    const dist = haversineMeters(from, to);
    if (!Number.isFinite(dist) || dist <= 0) return 600;

    const speedMetersPerSec = 8;
    const duration = (dist / speedMetersPerSec) * 1000;
    return Math.max(400, Math.min(duration, 2200));
  }, []);

  const stopRouteAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    setIsPlaying(false);

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  }, []);

  const startRouteAnimation = useCallback(() => {
    if (lineCoords.length < 2) return;

    stopRouteAnimation();
    isAnimatingRef.current = true;
    setIsPlaying(true);

    const first = lineCoords[0];
    animatedCoordinate.setValue({
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0
    });

    const runStep = (index: number) => {
      if (!isAnimatingRef.current) return;

      if (index >= lineCoords.length - 1) {
        isAnimatingRef.current = false;
        setIsPlaying(false);
        return;
      }

      const from = lineCoords[index];
      const to = lineCoords[index + 1];

      animateRotation(bearingDegrees(from, to));

      const duration = getSegmentDuration(from, to);

      animatedCoordinate
        .timing({
          latitude: to.latitude,
          longitude: to.longitude,
          duration,
          useNativeDriver: false,
          toValue: 0,
          latitudeDelta: 0,
          longitudeDelta: 0
        })
        .start();

      animationTimerRef.current = setTimeout(() => {
        runStep(index + 1);
      }, duration);
    };

    runStep(0);
  }, [animateRotation, animatedCoordinate, getSegmentDuration, lineCoords, stopRouteAnimation]);

  useEffect(() => {
    if (lineCoords.length < 1) return;

    const first = lineCoords[0];
    animatedCoordinate.setValue({
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0
    });
    rotationAnim.setValue(0);

    return () => {
      stopRouteAnimation();
    };
  }, [animatedCoordinate, lineCoords, rotationAnim, stopRouteAnimation]);

  /* ================= FIT ================= */
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
    const t1 = setTimeout(() => doFit(), 250);
    const t2 = setTimeout(() => doFit(), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [doFit, effectiveRouteId, mapReady]);

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

      <View style={[styles.mapWrap, { marginTop: HEADER_H }]}>
        <MapView
          key={effectiveRouteId}
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={mapOnPress}
          onMapReady={() => {
            setMapReady(true);
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

          {lineCoords.length > 1 && (
            <Polyline coordinates={lineCoords} strokeColor="#E28F00" strokeWidth={8} zIndex={5} />
          )}

          {directionMarkers.map((item) => (
            <Marker
              key={item.key}
              coordinate={item.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              zIndex={6}
            >
              <View
                style={[
                  styles.directionArrowWrap,
                  { transform: [{ rotate: `${item.rotation}deg` }] },
                ]}
              >
                <MaterialIcons name="navigation" size={18} color="#E28F00" />
              </View>
            </Marker>
          ))}

          {lineCoords.length > 1 && (
            <Marker.Animated
              ref={animatedMarkerRef}
              coordinate={animatedCoordinate as any}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={7}
            >
              <Animated.View
                style={[
                  styles.animatedPetOuter,
                  {
                    transform: [{ rotate: animatedRotation }],
                  },
                ]}
              >
                <View style={styles.headingArrow}>
                  <MaterialIcons name="navigation" size={14} color="#f59e0b" />
                </View>

                <Animated.View
                  style={{
                    transform: [{ rotate: animatedInverseRotation }],
                  }}
                >
                  <View style={styles.animatedPetWrap}>
                    {displayPhoto ? (
                      <Image source={{ uri: displayPhoto }} style={styles.animatedPetAvatar} />
                    ) : (
                      <MaterialIcons name="pets" size={22} color="#fff" />
                    )}
                  </View>
                </Animated.View>
              </Animated.View>
            </Marker.Animated>
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

        {lineCoords.length > 1 && (
          <TouchableOpacity
            style={[styles.playButton, { top: 16, right: 16 }]}
            onPress={isPlaying ? stopRouteAnimation : startRouteAnimation}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
            <Text style={styles.playButtonText}>{isPlaying ? "หยุด" : "เล่นเส้นทาง"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.infoSection, { position: "absolute", left: 16, right: 16, bottom: INFO_BOTTOM }]}>
        <View style={styles.topRow}>
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="pets" size={26} color="#9CA3AF" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.petName}>{displayPetName}</Text>
            <Text style={styles.range}>{rangeLine}</Text>

            {status === "recording" && (
              <Text style={styles.subMeta}>
                กำลังบันทึก • อัปเดทล่าสุด {route?.lastLiveIso ? formatThaiTime(route.lastLiveIso) + " น." : "-"}
              </Text>
            )}
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

  subMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },

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

  directionArrowWrap: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FDE6B8",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  playButton: {
    position: "absolute",
    zIndex: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  playButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  animatedPetOuter: {
    width: 42,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },

  headingArrow: {
    position: "absolute",
    top: -2,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  animatedPetWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden",
  },

  animatedPetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});