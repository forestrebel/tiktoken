import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'test-api-key',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'test-bucket.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 