// src/lib/firebase-sync.ts
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import type { Diagram } from './domain/diagram';

/**
 * Serialise a Diagram into a Firestore-safe plain object.
 * Firestore cannot store JS Date objects directly when using
 * `setDoc` with merge — we convert them to ISO strings.
 */
function serialiseDiagram(diagram: Diagram): Record<string, unknown> {
    return {
        id: diagram.id,
        name: diagram.name,
        databaseType: diagram.databaseType,
        databaseEdition: diagram.databaseEdition ?? null,
        tables: JSON.parse(JSON.stringify(diagram.tables ?? [])),
        relationships: JSON.parse(JSON.stringify(diagram.relationships ?? [])),
        dependencies: JSON.parse(JSON.stringify(diagram.dependencies ?? [])),
        areas: JSON.parse(JSON.stringify(diagram.areas ?? [])),
        customTypes: JSON.parse(JSON.stringify(diagram.customTypes ?? [])),
        notes: JSON.parse(JSON.stringify(diagram.notes ?? [])),
        createdAt: diagram.createdAt.toISOString(),
        updatedAt: diagram.updatedAt.toISOString(),
        _serverUpdatedAt: serverTimestamp(),
    };
}

/**
 * Deserialise a Firestore document snapshot into a Diagram object.
 */
function deserialiseDiagram(data: Record<string, unknown>): Diagram {
    return {
        id: data.id as string,
        name: data.name as string,
        databaseType: data.databaseType as Diagram['databaseType'],
        databaseEdition:
            (data.databaseEdition as Diagram['databaseEdition']) ?? undefined,
        tables: (data.tables as Diagram['tables']) ?? [],
        relationships: (data.relationships as Diagram['relationships']) ?? [],
        dependencies: (data.dependencies as Diagram['dependencies']) ?? [],
        areas: (data.areas as Diagram['areas']) ?? [],
        customTypes: (data.customTypes as Diagram['customTypes']) ?? [],
        notes: (data.notes as Diagram['notes']) ?? [],
        createdAt: new Date(data.createdAt as string),
        updatedAt: new Date(data.updatedAt as string),
    };
}

/**
 * Save (or create) a diagram document in Firestore.
 * Uses `merge: true` so partial updates don't wipe existing fields.
 */
export async function saveDiagramToFirebase(
    collabId: string,
    diagram: Diagram
): Promise<void> {
    const firestore = getFirestoreDB();
    if (!firestore) return;

    try {
        const diagramRef = doc(firestore, 'diagrams', collabId);
        await setDoc(diagramRef, serialiseDiagram(diagram), {
            merge: true,
        });
    } catch (error) {
        console.error('[Firebase] Error saving diagram:', error);
    }
}

/**
 * Subscribe to real-time changes on a diagram document in Firestore.
 * Returns an unsubscribe function.
 */
export function subscribeToFirebaseDiagram(
    collabId: string,
    onData: (diagram: Diagram) => void,
    onError?: (error: Error) => void,
    onNotFound?: () => void
): Unsubscribe | null {
    const firestore = getFirestoreDB();
    if (!firestore) return null;

    const diagramRef = doc(firestore, 'diagrams', collabId);

    return onSnapshot(
        diagramRef,
        (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                try {
                    const diagram = deserialiseDiagram(data);
                    onData(diagram);
                } catch (err) {
                    console.error(
                        '[Firebase] Error deserialising diagram:',
                        err
                    );
                }
            } else {
                // Document doesn't exist yet — notify the caller
                onNotFound?.();
            }
        },
        (error) => {
            console.error('[Firebase] Snapshot listener error:', error);
            onError?.(error);
        }
    );
}
