// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBeSJUsa_Tfa2FOG-JanFhboCwScpAdmLI",
  authDomain: "veno-ai-final.firebaseapp.com",
  projectId: "veno-ai-final",
  storageBucket: "veno-ai-final.firebasestorage.app",
  messagingSenderId: "597260170377",
  appId: "1:597260170377:web:3f82363b30d599875c8258",
  measurementId: "G-L2KMF0JFCJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
