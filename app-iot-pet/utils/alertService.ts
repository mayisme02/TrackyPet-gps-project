import { rtdb } from "../firebase/firebase";
import { ref as dbRef, push } from "firebase/database";

type AlertType = "exit" | "enter";

export async function pushAlertAndLog(params: {
  deviceId: string;
  type: AlertType;
  message?: string;
  radiusKm?: number;
  atUtc?: string;
  atTh?: string;

  // ✅ ผูกสัตว์กับ alert
  petId?: string | null;
  petName?: string | null;
  photoURL?: string | null;

  // ✅ ผูกกับ route history (สำคัญสำหรับกดแล้วไปหน้ารายละเอียด)
  routeId?: string | null;
}) {
  const {
    deviceId,
    type,
    radiusKm,
    atUtc = new Date().toISOString(),
    atTh,
    petId = null,
    petName = null,
    photoURL = null,
    routeId = null,
  } = params;

  const name = petName?.trim() ? petName.trim() : "สัตว์เลี้ยง";
  const message =
    params.message?.trim() ||
    (type === "exit" ? `${name} ออกนอกพื้นที่` : `${name} กลับเข้าพื้นที่`);

  const payload = {
    device: deviceId,
    type,
    message,
    radiusKm: radiusKm ?? null,
    atUtc,
    atTh: atTh ?? null,

    petId,
    petName,
    photoURL,

    routeId,
  };

  await push(dbRef(rtdb, `devices/${deviceId}/alerts`), payload);
  await push(dbRef(rtdb, `devices/${deviceId}/logs`), { kind: "alert", ...payload });
}