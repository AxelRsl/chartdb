// src/hooks/use-firebase-collab.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    isFirebaseConfigured,
    loginWithGoogle,
    logoutGoogle,
    subscribeToAuthChanges,
} from '@/lib/firebase';
import {
    saveDiagramToFirebase,
    subscribeToFirebaseDiagram,
} from '@/lib/firebase-sync';
import { useChartDB } from './use-chartdb';
import type { Diagram } from '@/lib/domain/diagram';
import type { User } from 'firebase/auth';

export interface UseFirebaseCollabReturn {
    /** Whether collaboration mode is active (has ?id= and Firebase is configured) */
    isCollabMode: boolean;
    /** Whether the onSnapshot listener is connected */
    isConnected: boolean;
    /** The collaboration document ID from the URL */
    collabId: string | null;
    /** Whether there are local changes waiting to be committed/accepted */
    hasUnsavedChanges: boolean;
    /** Whether a save/commit operation is currently in progress */
    isSaving: boolean;
    /** Manually commit and save local changes to Firebase */
    saveToFirebase: (label?: string) => Promise<void>;
    /** Whether current user is the owner/creator (axel041219@gmail.com) */
    isOwner: boolean;
    /** Whether current user is on a shared link but NOT the owner (New/Open disabled, but can edit) */
    isCollaborator: boolean;
    /** Whether editing is completely blocked (not owner AND not on a collab link) */
    isRestricted: boolean;
    /** Whether the user can edit/create tables (owner OR invited collaborator on a shared link) */
    canEdit: boolean;
    /** Logged in Google User if authenticated */
    user: User | null;
    /** Trigger Google Login popup */
    loginGoogle: () => Promise<User | null>;
    /** Trigger Google Logout */
    logoutGoogleAuth: () => Promise<void>;
}

/**
 * Hook that manages Firebase real-time collaboration.
 *
 * Reads `?id=<collabId>` from the URL query params. When present and
 * Firebase is configured, it:
 * 1. Subscribes to Firestore changes via onSnapshot
 * 2. Loads remote diagram data into ChartDB state
 * 3. Tracks local changes and saves to Firestore only on manual commit ("Aceptar cambios")
 * 4. Integrates Google Auth to determine Creator vs Collaborator roles
 */
export function useFirebaseCollab(): UseFirebaseCollabReturn {
    const [searchParams] = useSearchParams();
    const collabId = searchParams.get('id');

    const { currentDiagram, loadDiagramFromData } = useChartDB();

    const [isConnected, setIsConnected] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const CREATOR_EMAIL = 'axel041219@gmail.com';

    // Subscribe to Google Auth changes - only allow CREATOR_EMAIL
    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((u) => {
            if (u && u.email !== CREATOR_EMAIL) {
                logoutGoogle();
                setUser(null);
                alert(
                    `Acceso denegado. Solo la cuenta del creador (${CREATOR_EMAIL}) puede iniciar sesión.`
                );
            } else {
                setUser(u);
            }
        });
        return () => unsubscribe();
    }, []);

    // Flag to prevent saving back a diagram that was just received remotely
    const isRemoteUpdateRef = useRef(false);
    // Track whether we've loaded the initial remote diagram
    const hasLoadedRemoteRef = useRef(false);
    // Track JSON snapshot of the last saved diagram state to avoid false unsaved change indicators
    const lastSavedSnapshotRef = useRef<string>('');

    const isCollabMode = !!(collabId && isFirebaseConfigured());

    // Role logic:
    // - Owner (axel041219@gmail.com): full access everywhere
    // - Collaborator (on a ?id= shared link, not owner): can EDIT the shared diagram, but NOT create new/open
    // - Restricted (not owner, not on a shared link): EVERYTHING blocked
    const isOwner = !!user && user.email === CREATOR_EMAIL;
    const isCollaborator = !isOwner && isCollabMode;
    const isRestricted = !isOwner && !isCollabMode;
    const canEdit = isOwner || isCollaborator;

    // Helper to compute a structural JSON snapshot of a diagram
    const getDiagramSnapshot = useCallback((diagram: Diagram | null): string => {
        if (!diagram) return '';
        return JSON.stringify({
            name: diagram.name ?? '',
            databaseType: diagram.databaseType ?? '',
            tables: diagram.tables ?? [],
            relationships: diagram.relationships ?? [],
            areas: diagram.areas ?? [],
            notes: diagram.notes ?? [],
            customTypes: diagram.customTypes ?? [],
        });
    }, []);

    // ── Subscribe to Firestore onSnapshot ──────────────────────────
    useEffect(() => {
        if (!isCollabMode || !collabId) {
            setIsConnected(false);
            hasLoadedRemoteRef.current = false;
            setHasUnsavedChanges(false);
            lastSavedSnapshotRef.current = '';
            return;
        }

        const unsubscribe = subscribeToFirebaseDiagram(
            collabId,
            (remoteDiagram: Diagram) => {
                // Mark this update as remote so unsaved changes flag isn't raised
                isRemoteUpdateRef.current = true;
                loadDiagramFromData(remoteDiagram);
                hasLoadedRemoteRef.current = true;
                setIsConnected(true);

                // Update snapshot reference
                lastSavedSnapshotRef.current = getDiagramSnapshot(remoteDiagram);
                setHasUnsavedChanges(false);

                // Reset the flag after a tick so subsequent local edits raise unsaved status
                setTimeout(() => {
                    isRemoteUpdateRef.current = false;
                }, 150);
            },
            () => {
                setIsConnected(false);
            },
            // Document doesn't exist yet — bootstrap with local diagram
            () => {
                hasLoadedRemoteRef.current = true;
                setIsConnected(true);
                lastSavedSnapshotRef.current = getDiagramSnapshot(currentDiagram);
                saveDiagramToFirebase(collabId, currentDiagram, 'Creación inicial');
            }
        );

        if (!unsubscribe) {
            return;
        }

        setIsConnected(true);

        return () => {
            unsubscribe();
            setIsConnected(false);
            hasLoadedRemoteRef.current = false;
            lastSavedSnapshotRef.current = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collabId, isCollabMode]);

    // Track structural local changes to accurately set hasUnsavedChanges flag
    useEffect(() => {
        if (!isCollabMode || !collabId) return;
        if (isRemoteUpdateRef.current) return;
        if (!hasLoadedRemoteRef.current) return;

        const currentSnapshot = getDiagramSnapshot(currentDiagram);
        if (
            lastSavedSnapshotRef.current &&
            currentSnapshot !== lastSavedSnapshotRef.current
        ) {
            setHasUnsavedChanges(true);
        } else if (
            lastSavedSnapshotRef.current &&
            currentSnapshot === lastSavedSnapshotRef.current
        ) {
            setHasUnsavedChanges(false);
        }
    }, [currentDiagram, isCollabMode, collabId, getDiagramSnapshot]);

    // Browser close / reload protection pop-up when unsaved changes exist
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue =
                    'Tienes cambios sin guardar en tu diagrama. ¿Seguro que quieres salir?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // ── Manual Commit / Save function ("Aceptar cambios") ──────────
    const saveToFirebase = useCallback(
        async (label = 'Versión guardada') => {
            if (!isCollabMode || !collabId) return;

            setIsSaving(true);
            try {
                await saveDiagramToFirebase(collabId, currentDiagram, label);
                lastSavedSnapshotRef.current = getDiagramSnapshot(currentDiagram);
                setHasUnsavedChanges(false);
            } catch (error) {
                console.error('[Firebase] Error saving diagram:', error);
                throw error;
            } finally {
                setIsSaving(false);
            }
        },
        [isCollabMode, collabId, currentDiagram, getDiagramSnapshot]
    );

    const loginGoogle = useCallback(async () => {
        const loggedInUser = await loginWithGoogle();
        if (loggedInUser && loggedInUser.email !== CREATOR_EMAIL) {
            await logoutGoogle();
            setUser(null);
            alert(
                `Acceso denegado. Solo la cuenta del creador (${CREATOR_EMAIL}) puede iniciar sesión.`
            );
            return null;
        }
        return loggedInUser;
    }, []);

    const logoutGoogleAuth = useCallback(async () => {
        await logoutGoogle();
    }, []);

    return {
        isCollabMode,
        isConnected,
        collabId,
        hasUnsavedChanges,
        isSaving,
        saveToFirebase,
        isOwner,
        isCollaborator,
        isRestricted,
        canEdit,
        user,
        loginGoogle,
        logoutGoogleAuth,
    };
}


