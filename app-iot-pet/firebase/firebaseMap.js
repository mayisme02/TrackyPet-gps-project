import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://iot-and-app-default-rtdb.asia-southeast1.firebasedatabase.app=AIzaSyDH3MRSirLXj1-Ux8Rp3j97xlE-tmuJKyA",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [location, setLocation] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    const locRef = ref(db, "location");
    onValue(locRef, (snapshot) => {
      if (snapshot.exists()) {
        setLocation(snapshot.val());
      }
    });
  }, []);

  return (
    <View>
      <Text>Latitude: {location.lat}</Text>
      <Text>Longitude: {location.lng}</Text>
    </View>
  );
}