import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Firebase config will be provided by the application
  projectId: process.env.FIREBASE_PROJECT_ID || 'demo-tiktoken'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 