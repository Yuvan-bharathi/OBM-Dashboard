import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCt1nCHGueqClmFlXwNs5RDwla0KgPFqF8",
  authDomain: "order-booking-manager.firebaseapp.com",
  projectId: "order-booking-manager",
  storageBucket: "order-booking-manager.firebasestorage.app",
  messagingSenderId: "696198501849",
  appId: "1:696198501849:web:0df204a29bb6bf395035c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;