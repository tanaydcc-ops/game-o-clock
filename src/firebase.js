import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDCucYP2oRDXBUvCjV_UtEbAexkAdcciY",
  authDomain: "game-oclock.firebaseapp.com",
  projectId: "game-oclock",
  storageBucket: "game-oclock.firebasestorage.app",
  messagingSenderId: "1064905475973",
  appId: "1:1064905475973:web:ea83b881153317d5c7e6ec",
  databaseURL: "https://game-oclock-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);