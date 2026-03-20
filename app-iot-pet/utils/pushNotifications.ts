import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notification ต้องทดสอบบนเครื่องจริง");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("ผู้ใช้ไม่อนุญาต notification");
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.log("ไม่พบ EAS projectId");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export async function savePushTokenToFirestore() {
  if (!auth.currentUser) return;

  const token = await registerForPushNotificationsAsync();
  if (!token) return;

  const uid = auth.currentUser.uid;

  await setDoc(
    doc(db, "users", uid, "expoTokens", token),
    {
      token,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}