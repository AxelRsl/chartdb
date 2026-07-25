// src/components/share-button/share-button.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Share2,
    Copy,
    Check,
    Link,
    Users,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/button/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/popover/popover';
import { Input } from '@/components/input/input';
import { useChartDB } from '@/hooks/use-chartdb';
import { isFirebaseConfigured } from '@/lib/firebase';
import { saveDiagramToFirebase } from '@/lib/firebase-sync';
import { Label } from '@/components/label/label';
import { generateId } from '@/lib/utils';

export const ShareButton: React.FC = () => {
    const { currentDiagram } = useChartDB();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCollabId = searchParams.get('id');

    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const firebaseReady = useMemo(() => isFirebaseConfigured(), []);

    // Get the shareable URL based on the active collabId (or null if not created yet)
    const currentShareUrl = useMemo(() => {
        if (!activeCollabId) return null;
        const base = window.location.origin;
        return `${base}/?id=${encodeURIComponent(activeCollabId)}`;
    }, [activeCollabId]);

    const copyToClipboard = useCallback(async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    }, []);

    // Generate a unique collab ID, save to Firestore, update URL params, and copy link
    const handleGenerateLink = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const newCollabId = generateId();
            await saveDiagramToFirebase(newCollabId, currentDiagram);

            // Set URL search param ?id=newCollabId so app enters collab mode
            setSearchParams({ id: newCollabId }, { replace: true });

            const newUrl = `${window.location.origin}/?id=${encodeURIComponent(newCollabId)}`;
            await copyToClipboard(newUrl);
        } catch (error) {
            console.error('[ShareButton] Error saving diagram:', error);
            setSaveError(
                'Error al guardar en Firebase. Inténtalo de nuevo.'
            );
        } finally {
            setIsSaving(false);
        }
    }, [currentDiagram, setSearchParams, copyToClipboard]);

    const handleCopy = useCallback(async () => {
        if (currentShareUrl) {
            await copyToClipboard(currentShareUrl);
        }
    }, [currentShareUrl, copyToClipboard]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    id="share-diagram-button"
                >
                    <Users className="size-3.5" />
                    <span className="hidden sm:inline">Compartir</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="flex flex-col gap-3">
                    {!firebaseReady ? (
                        /* ── Firebase NOT configured ── */
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 shrink-0 text-yellow-500" />
                                <h4 className="text-sm font-semibold">
                                    Configuración requerida
                                </h4>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Para habilitar la colaboración en tiempo real,
                                necesitas configurar las variables de entorno de
                                Firebase.
                            </p>
                        </div>
                    ) : !activeCollabId ? (
                        /* ── State 1: Link not generated yet ── */
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Share2 className="size-4 text-pink-500" />
                                    <h4 className="text-sm font-semibold">
                                        Compartir diagrama
                                    </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Genera un enlace único para permitir que
                                    otros editen este diagrama en tiempo real.
                                </p>
                            </div>

                            {saveError && (
                                <p className="text-xs text-red-500">
                                    {saveError}
                                </p>
                            )}

                            <Button
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleGenerateLink}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <Link className="size-3.5" />
                                )}
                                {isSaving
                                    ? 'Guardando en Firebase...'
                                    : 'Generar enlace colaborativo'}
                            </Button>
                        </>
                    ) : (
                        /* ── State 2: Link already generated / in collab mode ── */
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Check className="size-4 text-green-500" />
                                    <h4 className="text-sm font-semibold">
                                        Enlace colaborativo activo
                                    </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Este diagrama está listo para colaboración en tiempo real. Compártelo con quien quieras.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Enlace de colaboración
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        readOnly
                                        value={currentShareUrl ?? ''}
                                        className="h-8 flex-1 text-xs"
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 px-2"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <Check className="size-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};