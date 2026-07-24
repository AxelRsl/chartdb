// src/hooks/use-firebase-collab.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
    saveDiagramToFirebase,
    subscribeToFirebaseDiagram,
} from '@/lib/firebase-sync';
import { useChartDB } from './use-chartdb';
import type { Diagram } from '@/lib/domain/diagram';

const SAVE_DEBOUNCE_MS = 1000;

export interface UseFirebaseCollabReturn {
    /** Whether collaboration mode is active (has ?id= and Firebase is configured) */
    isCollabMode: boolean;
    /** Whether the onSnapshot listener is connected */
    isConnected: boolean;
    /** The collaboration document ID from the URL */
    collabId: string | null;
    /** Manually trigger a save to Firebase (debounced internally) */
    saveToFirebase: () => void;
}

/**
 * Hook that manages Firebase real-time collaboration.
 *
 * Reads `?id=<collabId>` from the URL query params. When present and
 * Firebase is configured, it:
 * 1. Subscribes to Firestore changes via onSnapshot
 * 2. Loads remote diagram data into ChartDB state
 * 3. Debounces local changes and pushes them to Firestore
 *
 * Uses a `isRemoteUpdateRef` flag to prevent infinite loops:
 *   remote change → loadDiagramFromData → triggers currentDiagram change
 *   → saveToFirebase → remote change → …
 */
export function useFirebaseCollab(): UseFirebaseCollabReturn {
    const [searchParams] = useSearchParams();
    const collabId = searchParams.get('id');

    const { currentDiagram, loadDiagramFromData } = useChartDB();

    const [isConnected, setIsConnected] = useState(false);

    // Flag to prevent saving back a diagram that was just received remotely
    const isRemoteUpdateRef = useRef(false);
    // Debounce timer handle
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track whether we've loaded the initial remote diagram
    const hasLoadedRemoteRef = useRef(false);

    const isCollabMode = !!(collabId && isFirebaseConfigured());

    // ── Subscribe to Firestore onSnapshot ──────────────────────────
    useEffect(() => {
        if (!isCollabMode || !collabId) {
            setIsConnected(false);
            hasLoadedRemoteRef.current = false;
            return;
        }

        const unsubscribe = subscribeToFirebaseDiagram(
            collabId,
            (remoteDiagram: Diagram) => {
                // Mark this update as remote so the save effect skips it
                isRemoteUpdateRef.current = true;
                loadDiagramFromData(remoteDiagram);
                hasLoadedRemoteRef.current = true;
                setIsConnected(true);

                // Reset the flag after a tick so the next local edit is saved
                setTimeout(() => {
                    isRemoteUpdateRef.current = false;
                }, 100);
            },
            () => {
                setIsConnected(false);
            }
        );

        // If subscribeToFirebaseDiagram returned null, Firebase is not ready
        if (!unsubscribe) {
            return;
        }

        setIsConnected(true);

        return () => {
            unsubscribe();
            setIsConnected(false);
            hasLoadedRemoteRef.current = false;
        };
        // loadDiagramFromData is stable (from useCallback in provider)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collabId, isCollabMode]);

    // ── Debounced save to Firebase when diagram changes ────────────
    const saveToFirebase = useCallback(() => {
        if (!isCollabMode || !collabId) return;
        if (isRemoteUpdateRef.current) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            saveDiagramToFirebase(collabId, currentDiagram);
        }, SAVE_DEBOUNCE_MS);
    }, [isCollabMode, collabId, currentDiagram]);

    // Automatically save when currentDiagram changes (debounced)
    useEffect(() => {
        if (!isCollabMode || !collabId) return;
        // Don't save if this change came from a remote update
        if (isRemoteUpdateRef.current) return;
        // Don't save until we've loaded the initial remote state
        // (avoids overwriting remote data with empty local state)
        if (!hasLoadedRemoteRef.current && !currentDiagram.tables?.length) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            if (!isRemoteUpdateRef.current) {
                saveDiagramToFirebase(collabId, currentDiagram);
            }
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDiagram, isCollabMode, collabId]);

    return {
        isCollabMode,
        isConnected,
        collabId,
        saveToFirebase,
    };
}
