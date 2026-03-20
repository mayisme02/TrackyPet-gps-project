import { rtdb } from "../firebase/firebase";
import { ref as dbRef, push, set } from "firebase/database";

type PushAlertPayload = {
  deviceId: string;
  type: string;
  message?: string;
  radiusKm?: number;
  atUtc: string;
  atTh: string;
  petId?: string | null;
  petName?: string | null;
  photoURL?: string | null;
  routeId?: string | null;
  ownerUid?: string | null;
};

export async function pushAlertAndLog(payload: PushAlertPayload) {
  const alertRef = push(dbRef(rtdb, `devices/${payload.deviceId}/alerts`));
  const logRef = push(dbRef(rtdb, `devices/${payload.deviceId}/logs`));

  const data = {
    type: payload.type,
    message: payload.message ?? "",
    radiusKm: payload.radiusKm ?? null,
    atUtc: payload.atUtc,
    atTh: payload.atTh,
    petId: payload.petId ?? null,
    petName: payload.petName ?? null,
    photoURL: payload.photoURL ?? null,
    routeId: payload.routeId ?? null,
    ownerUid: payload.ownerUid ?? null,
  };

  await Promise.all([set(alertRef, data), set(logRef, data)]);
}