import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDIo7q8OuI1P63q9t9E1s-ENQjBdCd37nI",
  authDomain: "arkive-da661.firebaseapp.com",
  databaseURL: "https://arkive-da661-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "arkive-da661",
  storageBucket: "arkive-da661.firebasestorage.app",
  messagingSenderId: "416097604327",
  appId: "1:416097604327:web:198600d582bd82aeee8842"
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
