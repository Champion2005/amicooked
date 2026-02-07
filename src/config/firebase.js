import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, SignInMethod } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBzet1ZxKG9z48ixDvrbUH-y252G7NnGks",
  authDomain: "amicooked-b65b3.firebaseapp.com",
  projectId: "amicooked-b65b3",
  storageBucket: "amicooked-b65b3.firebasestorage.app",
  messagingSenderId: "291973250808",
  appId: "1:291973250808:web:ee17e5523a5852e94fc50d",
  measurementId: "G-TQDK8DDJVK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// GitHub Auth Provider
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('repo');
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');
githubProvider.setCustomParameters({
  allow_signup: 'true',
  SignInMethod: SignInMethod.POPUP
});

export default app;
