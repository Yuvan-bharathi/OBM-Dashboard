import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHfedxPy1k6avCuq4fXHDBGsSvnDoQM7k",
  authDomain: "order-mangment-7f3fb.firebaseapp.com",
  projectId: "order-mangment-7f3fb",
  storageBucket: "order-mangment-7f3fb.firebasestorage.app",
  messagingSenderId: "862807416086",
  appId: "1:862807416086:web:90c3df21d5fd37782a8437",
  measurementId: "G-B9QE5XM6F3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;