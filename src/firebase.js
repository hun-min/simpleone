import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByZTcOtdHQObh97tVgGM2J-nbyTE_G5hE",
  authDomain: "simpleone-1f97d.firebaseapp.com",
  projectId: "simpleone-1f97d",
  storageBucket: "simpleone-1f97d.firebasestorage.app",
  messagingSenderId: "674624721625",
  appId: "1:674624721625:web:802b18545beb7d6ddfa4c8",
  measurementId: "G-T25B4R2335"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence);
