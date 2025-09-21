import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDH3MRSirLXj1-Ux8Rp3j97xlE-tmuJKyA",
  authDomain: "iot-and-app.firebaseapp.com",
  databaseURL: "https://iot-and-app-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "iot-and-app",
  storageBucket: "iot-and-app.firebasestorage.app",
  messagingSenderId: "722936131366",
  appId: "1:722936131366:web:93d18380fa9186b3c95be7",
  measurementId: "G-47DE585H5X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage)});

// Initialize Firestore
const db = getFirestore(app);

const rtdb = getDatabase(app);
export { auth, db, rtdb };