import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb, auth, db } from "../firebase/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { useFocusEffect } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

type LogItem = {
  key: string;
  kind?: string;
  type?: string;
  message?: string;
  atUtc?: string;
  atTh?: string;
  device?: string;
  radiusKm?: number;
  ownerUid?: string | null; // ✅ เพิ่ม
};

type ListItem =
  | { kind: "section"; id: string; title: string }
  | { kind: "log"; data: LogItem };

const toDateHeaderTH = (iso?: string) => {
  if (!iso) return "ไม่ทราบวันที่";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ไม่ทราบวันที่";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getActiveDeviceKey = (uid: string) => `activeDevice_${uid}`;

export default function LogScreen() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const validateDeviceOwnership = useCallback(
    async (uid: string, deviceId: string) => {
      try {
        // เปลี่ยน path นี้ให้ตรงกับของจริง
        const deviceRef = doc(db, "users", uid, "devices", deviceId);
        const snap = await getDoc(deviceRef);
        return snap.exists();
      } catch {
        return false;
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      let unsub: any;

      const load = async () => {
        const user = auth.currentUser;
        if (!user) {
          setLogs([]);
          setLoading(false);
          return;
        }

        const uid = user.uid;
        const deviceId = await AsyncStorage.getItem(getActiveDeviceKey(uid));

        if (!deviceId) {
          setLogs([]);
          setLoading(false);
          return;
        }

        const isOwner = await validateDeviceOwnership(uid, deviceId);
        if (!isOwner) {
          setLogs([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        const ref = dbRef(rtdb, `devices/${deviceId}/logs`);

        unsub = onValue(
          ref,
          (snap) => {
            const v = snap.val() || {};
            const rows: LogItem[] = Object.keys(v).map((k) => ({
              key: k,
              ...(v[k] || {}),
            }));

            const filtered = rows
              .filter((x) => !x.ownerUid || x.ownerUid === uid)
              .sort((a, b) => {
                const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
                const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
                return tb - ta;
              });

            setLogs(filtered);
            setLoading(false);
          },
          () => setLoading(false)
        );
      };

      load();
      return () => unsub && unsub();
    }, [validateDeviceOwnership])
  );

  const listData: ListItem[] = useMemo(() => {
    if (!logs.length) return [];
    const out: ListItem[] = [];
    let last = "";
    for (const l of logs) {
      const h = toDateHeaderTH(l.atUtc || l.atTh);
      if (h !== last) {
        last = h;
        out.push({ kind: "section", id: `s-${h}`, title: h });
      }
      out.push({ kind: "log", data: l });
    }
    return out;
  }, [logs]);

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => (item.kind === "section" ? item.id : item.data.key || `l-${i}`)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            if (item.kind === "section") return <Text style={styles.section}>{item.title}</Text>;

            const x = item.data;
            const type = (x.type || "").toLowerCase();
            const title =
              type === "exit" ? "ออกนอกพื้นที่" : type === "enter" ? "กลับเข้าพื้นที่" : "Log";

            return (
              <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {!!x.message && <Text>{x.message}</Text>}
                <Text style={styles.time}>{x.atTh || x.atUtc}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 40 }}>ยังไม่มี log</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  title: {
    fontWeight: "800",
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
});