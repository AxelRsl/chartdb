// src/lib/firebase.ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
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

/**
 * Lazily initialise Firebase and return the Firestore instance.
 * Returns `null` when credentials are missing so the app can
 * gracefully fall back to local-only mode.
 */
export function getFirestoreDB(): Firestore | null {
    if (!isFirebaseConfigured()) {
        return null;
    }

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

    if (!db) {
        db = getFirestore(app);
    }

    return db;
}
