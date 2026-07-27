// src/lib/firebase.ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    type Auth,
    type User,
} from 'firebase/auth';
import {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
} from './env';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Check whether all required Firebase environment variables are present.
 */
export function isFirebaseConfigured(): boolean {
    return !!(
        FIREBASE_API_KEY &&
        FIREBASE_AUTH_DOMAIN &&
        FIREBASE_PROJECT_ID &&
        FIREBASE_APP_ID
    );
}

function getApp(): FirebaseApp | null {
    if (!isFirebaseConfigured()) return null;
    if (!app) {
        app = initializeApp({
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN,
            projectId: FIREBASE_PROJECT_ID,
            storageBucket: FIREBASE_STORAGE_BUCKET,
            messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
            appId: FIREBASE_APP_ID,
        });
    }
    return app;
}

/**
 * Lazily initialise Firebase and return the Firestore instance.
 */
export function getFirestoreDB(): Firestore | null {
    const firebaseApp = getApp();
    if (!firebaseApp) return null;

    if (!db) {
        db = getFirestore(firebaseApp);
    }

    return db;
}

/**
 * Lazily initialise Firebase Auth.
 */
export function getFirebaseAuth(): Auth | null {
    const firebaseApp = getApp();
    if (!firebaseApp) return null;

    if (!auth) {
        auth = getAuth(firebaseApp);
    }

    return auth;
}

/**
 * Sign in with Google provider.
 */
export async function loginWithGoogle(): Promise<User | null> {
    const authInstance = getFirebaseAuth();
    if (!authInstance) return null;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
}

/**
 * Sign out current user.
 */
export async function logoutGoogle(): Promise<void> {
    const authInstance = getFirebaseAuth();
    if (!authInstance) return;
    await signOut(authInstance);
}

/**
 * Subscribe to auth state changes.
 */
export function subscribeToAuthChanges(
    callback: (user: User | null) => void
): () => void {
    const authInstance = getFirebaseAuth();
    if (!authInstance) return () => {};
    return onAuthStateChanged(authInstance, callback);
}

