import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDH3MRSirLXj1-Ux8Rp3j97xlE-tmuJKyA",
  authDomain: "iot-and-app.firebaseapp.com",
  projectId: "iot-and-app",
  storageBucket: "iot-and-app.firebasestorage.app",
  messagingSenderId: "722936131366",
  appId: "1:722936131366:web:93d18380fa9186b3c95be7",
  measurementId: "G-47DE585H5X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;