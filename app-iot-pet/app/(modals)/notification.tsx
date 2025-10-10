import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rtdb } from '../../firebase/firebase'; 
import { ref as dbRef, onValue, remove } from 'firebase/database';

const DEVICE_ID = 'DEVICE-01';

type AlertItem = {
  key?: string;        
  type: 'exit' | 'enter';
  message: string;
  atTh?: string;       // เวลาไทย (จากบอร์ด)
  atUtc?: string;      // สำรอง UTC
  radiusKm?: number;
  device?: string;
};

export default function NotificationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const handleBack = () => {
    // ถ้าอยู่ใน stack ใช้ back ดีกว่า
    router.back();
  };

  const load = useCallback(() => {
    const ref = dbRef(rtdb, `devices/${DEVICE_ID}/alerts`);
    return onValue(ref, (snap) => {
      const v = snap.val() || {};
      // map เป็น array + sort เวลาใหม่อยู่บน
      const rows: AlertItem[] = Object.keys(v).map(k => ({ key: k, ...v[k] }));
      rows.sort((a, b) => {
        const ta = a.atUtc ? Date.parse(a.atUtc) : 0;
        const tb = b.atUtc ? Date.parse(b.atUtc) : 0;
        return tb - ta;
      });
      setAlerts(rows);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const off = load();
      return () => off && off();
    }, [load])
  );

  const clearAll = () => {
    if (!alerts.length) return;
    Alert.alert('ลบการแจ้งเตือนทั้งหมด?', 'คุณต้องการลบทั้งหมดหรือไม่', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบทั้งหมด',
        style: 'destructive',
        onPress: async () => {
          // ลบทีละรายการ
          await Promise.all(
            alerts.map(a => remove(dbRef(rtdb, `devices/${DEVICE_ID}/alerts/${a.key}`)).catch(() => null))
          );
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: AlertItem }) => {
    const isExit = item.type === 'exit';
    return (
      <View style={[styles.card, isExit ? styles.exitCard : styles.enterCard]}>
        <View style={styles.row}>
          <Ionicons
            name={isExit ? 'alert-circle' : 'checkmark-circle'}
            size={22}
            color={isExit ? '#b00020' : '#2e7d32'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.title, { color: isExit ? '#b00020' : '#2e7d32' }]}>
            {isExit ? 'ออกนอกพื้นที่' : 'กลับเข้าพื้นที่'}
          </Text>
        </View>
        {!!item.message && <Text style={styles.message}>{item.message}</Text>}
        <Text style={styles.time}>{item.atTh || item.atUtc}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>การแจ้งเตือน</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator />
        ) : alerts.length === 0 ? (
          <Text style={{ color: '#666' }}>ยังไม่มีการแจ้งเตือน</Text>
        ) : (
          <FlatList
            contentContainerStyle={{ padding: 16 }}
            data={alerts}
            renderItem={renderItem}
            keyExtractor={(it) => it.key!}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#FFB800',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', left: 16, top: 50 },
  clearBtn: { position: 'absolute', right: 16, top: 50 },
  headerText: { fontSize: 18, fontWeight: 'bold', color: 'white' },

  body: { flex: 1 },

  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    marginBottom: 10,
  },
  exitCard: { borderColor: '#ffcccb', backgroundColor: '#fff8f8' },
  enterCard: { borderColor: '#cde7d6', backgroundColor: '#f7fffa' },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700' },
  message: { color: '#333', marginBottom: 6 },
  time: { color: '#666', fontSize: 12 },
});
