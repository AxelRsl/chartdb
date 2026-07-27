// src/lib/firebase-sync.ts
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import type { Diagram } from './domain/diagram';

export interface DiagramRevision {
    id: string;
    timestamp: string;
    label: string;
    diagram: Diagram;
}

function toIsoString(val: unknown): string {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    return new Date().toISOString();
}

/**
 * Serialise a Diagram into a Firestore-safe plain object.
 * Firestore cannot store JS Date objects directly when using
 * `setDoc` with merge — we convert them to ISO strings.
 */
function serialiseDiagram(diagram: Diagram): Record<string, unknown> {
    return {
        id: diagram.id,
        name: diagram.name ?? 'Diagrama sin título',
        databaseType: diagram.databaseType,
        databaseEdition: diagram.databaseEdition ?? null,
        tables: JSON.parse(JSON.stringify(diagram.tables ?? [])),
        relationships: JSON.parse(JSON.stringify(diagram.relationships ?? [])),
        dependencies: JSON.parse(JSON.stringify(diagram.dependencies ?? [])),
        areas: JSON.parse(JSON.stringify(diagram.areas ?? [])),
        customTypes: JSON.parse(JSON.stringify(diagram.customTypes ?? [])),
        notes: JSON.parse(JSON.stringify(diagram.notes ?? [])),
        createdAt: toIsoString(diagram.createdAt),
        updatedAt: toIsoString(diagram.updatedAt),
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
 * Save (or create) a diagram document in Firestore and push a new revision.
 * Limits revisions to the 10 most recent, purging older ones.
 */
export async function saveDiagramToFirebase(
    collabId: string,
    diagram: Diagram,
    label = 'Versión guardada'
): Promise<void> {
    const firestore = getFirestoreDB();
    if (!firestore) return;

    try {
        const diagramRef = doc(firestore, 'diagrams', collabId);
        const serialised = serialiseDiagram(diagram);
        await setDoc(diagramRef, serialised, { merge: true });

        // Save a revision entry in subcollection
        const revisionsRef = collection(firestore, 'diagrams', collabId, 'revisions');
        const nowIso = new Date().toISOString();
        await addDoc(revisionsRef, {
            timestamp: nowIso,
            label,
            diagram: serialised,
        });

        // Enforce max 10 revisions limit by deleting oldest
        const q = query(revisionsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 10) {
            const docsToDelete = snapshot.docs.slice(0, snapshot.docs.length - 10);
            for (const docSnap of docsToDelete) {
                await deleteDoc(docSnap.ref);
            }
        }
    } catch (error) {
        console.error('[Firebase] Error saving diagram and revision:', error);
        throw error;
    }
}

/**
 * Get all available revisions for a diagram (max 10), ordered newest first.
 */
export async function getDiagramRevisions(collabId: string): Promise<DiagramRevision[]> {
    const firestore = getFirestoreDB();
    if (!firestore) return [];

    try {
        const revisionsRef = collection(firestore, 'diagrams', collabId, 'revisions');
        const q = query(revisionsRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                timestamp: data.timestamp as string,
                label: (data.label as string) ?? 'Versión guardada',
                diagram: deserialiseDiagram(data.diagram as Record<string, unknown>),
            };
        });
    } catch (error) {
        console.error('[Firebase] Error fetching revisions:', error);
        return [];
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

