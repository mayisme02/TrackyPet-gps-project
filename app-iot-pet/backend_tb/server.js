require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT,
  TB_BASE_URL,
  TB_USERNAME,
  TB_PASSWORD,
} = process.env;

/* ===============================
   DEVICE CODE → DEVICE ID MAP
   (ตรงนี้คือหัวใจของแนวทางที่ 1)
================================ */
const DEVICE_MAP = {
  "PET-M3238-N3466": "84c3afd0-ebf4-11f0-b6de-09388ec431d8",
  // เพิ่มได้อีก
  // "PET-002": "xxxx-xxxx"
};

/* ===============================
   LOGIN THINGSBOARD (JWT)
================================ */
async function loginThingsBoard() {
  const res = await axios.post(`${TB_BASE_URL}/api/auth/login`, {
    username: TB_USERNAME,
    password: TB_PASSWORD,
  });
  return res.data.token;
}

/* ===============================
   FETCH GPS
================================ */
app.post("/api/device/location", async (req, res) => {
  const { deviceCode } = req.body;

  // 1️⃣ ตรวจ code
  if (!deviceCode) {
    return res.status(400).json({ error: "NO_DEVICE_CODE" });
  }

  const deviceId = DEVICE_MAP[deviceCode];

  if (!deviceId) {
    return res.status(401).json({ error: "INVALID_DEVICE_CODE" });
  }

  try {
    // 2️⃣ Login TB
    const jwt = await loginThingsBoard();

    // 3️⃣ ดึง telemetry
const tbRes = await axios.get(
  `${TB_BASE_URL}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
  {
    headers: {
      "X-Authorization": `Bearer ${jwt}`, // ✅ สำคัญ
    },
    params: {
      keys: "lat,lon",
      limit: 1,
    },
  }
);


    const lat = tbRes.data.lat?.[0];
    const lon = tbRes.data.lon?.[0];

    if (!lat || !lon) {
      return res.status(404).json({ error: "GPS_NOT_FOUND" });
    }

    res.json({
      latitude: parseFloat(lat.value),
      longitude: parseFloat(lon.value),
      ts: lat.ts,
    });
  } catch (err) {
    console.error("TB ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "THINGSBOARD_ERROR" });
  }
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT || 3000, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT || 3000}`);
});