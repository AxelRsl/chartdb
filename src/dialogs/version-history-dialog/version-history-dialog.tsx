// src/dialogs/version-history-dialog/version-history-dialog.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/dialog/dialog';
import { Button } from '@/components/button/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/table/table';
import { GitCommit, History, Loader2, RotateCcw } from 'lucide-react';
import {
    getDiagramRevisions,
    saveDiagramToFirebase,
    type DiagramRevision,
} from '@/lib/firebase-sync';
import { useChartDB } from '@/hooks/use-chartdb';

export interface VersionHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collabId: string | null;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
    open,
    onOpenChange,
    collabId,
}) => {
    const { loadDiagramFromData } = useChartDB();
    const [revisions, setRevisions] = useState<DiagramRevision[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    const loadRevisions = useCallback(async () => {
        if (!collabId) return;
        setIsLoading(true);
        try {
            const data = await getDiagramRevisions(collabId);
            setRevisions(data);
        } catch (error) {
            console.error('[VersionHistory] Error loading revisions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [collabId]);

    useEffect(() => {
        if (open && collabId) {
            loadRevisions();
        }
    }, [open, collabId, loadRevisions]);

    const handleRestore = async (revision: DiagramRevision) => {
        if (!collabId) return;
        setRestoringId(revision.id);
        try {
            const restoredLabel = `Restaurado a versión del ${new Date(revision.timestamp).toLocaleString()}`;
            // 1. Save restored diagram as new active state + revision in Firebase
            await saveDiagramToFirebase(collabId, revision.diagram, restoredLabel);
            // 2. Load into local ChartDB context
            loadDiagramFromData(revision.diagram);
            onOpenChange(false);
        } catch (error) {
            console.error('[VersionHistory] Error restoring revision:', error);
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="size-5 text-pink-500" />
                        Historial de Versiones (Git-like)
                    </DialogTitle>
                    <DialogDescription>
                        Se guardan automáticamente hasta 10 versiones más recientes en Firebase.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-2 max-h-[350px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Cargando versiones...
                        </div>
                    ) : revisions.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                            <GitCommit className="size-6 text-muted-foreground/60" />
                            <span>No hay versiones guardadas aún.</span>
                            <span className="text-xs">
                                Haz clic en &quot;Aceptar cambios&quot; para crear la primera versión.
                            </span>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha / Hora</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Tablas</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {revisions.map((rev, index) => {
                                    const dateStr = new Date(rev.timestamp).toLocaleString();
                                    const isRestoring = restoringId === rev.id;

                                    return (
                                        <TableRow key={rev.id}>
                                            <TableCell className="font-mono text-xs">
                                                {dateStr}
                                                {index === 0 && (
                                                    <span className="ml-1.5 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                                                        Actual
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {rev.label}
                                            </TableCell>
                                            <TableCell className="text-center text-xs">
                                                {rev.diagram.tables?.length ?? 0}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 gap-1 text-xs"
                                                    onClick={() => handleRestore(rev)}
                                                    disabled={isRestoring || index === 0}
                                                >
                                                    {isRestoring ? (
                                                        <Loader2 className="size-3 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="size-3" />
                                                    )}
                                                    Restaurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
