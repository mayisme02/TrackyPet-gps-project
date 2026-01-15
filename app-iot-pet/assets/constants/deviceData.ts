export type DeviceType = {
  type: string;               // KEY หลัก (ใช้เชื่อมระบบ)
  name: string;               // ชื่อที่แสดง
  description: string;        // คำอธิบาย
  image: { uri: string };     // รูปอุปกรณ์
};

export const DEVICE_TYPES: Record<string, DeviceType> = {
  GPS_TRACKER_A7670: {
    type: "GPS_TRACKER_A7670E",
    name: "LilyGo A7670E",
    description: "GSM + GPS Module (ESP32)",
    image: {
      uri: "https://s.alicdn.com/@sc04/kf/H826482faad2642b489c06215a46ef2f1p.jpg",
    },
  },

  GPS_TRACKER_MINI: {
    type: "GPS_TRACKER_MINI",
    name: "Mini GPS Tracker",
    description: "Compact GPS Module",
    image: {
      uri: "https://via.placeholder.com/150",
    },
  },
};
