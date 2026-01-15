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
      uri: "https://m.media-amazon.com/images/I/61GT9Lf8WsL.jpg",
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
