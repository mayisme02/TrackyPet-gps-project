const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

async function sendExpoPush(expoTokens, title, body, data) {
  const messages = expoTokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  const chunkSize = 100;

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
  }
}

exports.onNewAlertSendPush = functions.database
  .ref("/devices/{deviceId}/alerts/{alertId}")
  .onCreate(async (snap, ctx) => {
    const alert = snap.val();
    const deviceId = ctx.params.deviceId;

    if (!alert) return null;
    if (alert.type !== "exit") return null;

    const ownerUid = alert.ownerUid;
    if (!ownerUid) return null;

    const tokensSnap = await admin
      .firestore()
      .collection("users")
      .doc(ownerUid)
      .collection("expoTokens")
      .get();

    const expoTokens = tokensSnap.docs
      .map((d) => d.data().token)
      .filter(Boolean);

    if (!expoTokens.length) return null;

    const petName = alert.petName || "สัตว์เลี้ยง";

    await sendExpoPush(
      expoTokens,
      "แจ้งเตือนสัตว์เลี้ยง",
      `${petName} ออกนอกพื้นที่แล้ว`,
      {
        routeId: alert.routeId || null,
      }
    );

    return null;
  });