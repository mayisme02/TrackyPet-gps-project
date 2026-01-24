import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rtdb } from "@/firebase/firebase";
import { ref, onValue } from "firebase/database";

export function useNotificationBadge(activeDevice?: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!activeDevice) {
      setCount(0);
      return;
    }

    const load = async () => {
      const lastRead =
        (await AsyncStorage.getItem(
          `notification_last_read_${activeDevice}`
        )) ?? "0";

      const lastReadTs = Number(lastRead);

      const refDb = ref(rtdb, `devices/${activeDevice}/alerts`);

      return onValue(refDb, (snap) => {
        const v = snap.val() || {};
        let unread = 0;

        Object.values(v).forEach((a: any) => {
          const t = a.atUtc ? Date.parse(a.atUtc) : 0;
          if (t > lastReadTs) unread++;
        });

        setCount(unread);
      });
    };

    let unsub: any;
    load().then((u) => (unsub = u));
    return () => unsub && unsub();
  }, [activeDevice]);

  return count;
}
