// src/components/share-button/share-button.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
    Share2,
    Copy,
    Check,
    Link,
    Users,
    AlertCircle,
    Loader2,
    ExternalLink,
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

export const ShareButton: React.FC = () => {
    const { diagramName, currentDiagram } = useChartDB();
    const [copied, setCopied] = useState(false);
    const [customId, setCustomId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    // Once saved, show the link panel instead of the create form
    const [savedShareUrl, setSavedShareUrl] = useState<string | null>(null);

    const firebaseReady = useMemo(() => isFirebaseConfigured(), []);

    // Build a slug from the diagram name, falling back to a timestamp
    const defaultSlug = useMemo(() => {
        if (diagramName) {
            return diagramName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        return `diagram-${Date.now()}`;
    }, [diagramName]);

    const collabId = customId.trim() || defaultSlug;

    const shareUrl = useMemo(() => {
        const base = window.location.origin;
        return `${base}/?id=${encodeURIComponent(collabId)}`;
    }, [collabId]);

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

    // Save diagram to Firestore, then show + auto-copy the shareable link
    const handleCreateLink = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await saveDiagramToFirebase(collabId, currentDiagram);
            const url = shareUrl;
            setSavedShareUrl(url);
            await copyToClipboard(url);
        } catch (error) {
            console.error('[ShareButton] Error saving diagram:', error);
            setSaveError(
                'Error al guardar. Verifica la configuración de Firebase.'
            );
        } finally {
            setIsSaving(false);
        }
    }, [collabId, currentDiagram, shareUrl, copyToClipboard]);

    // Copy the already-generated link
    const handleCopyLink = useCallback(async () => {
        if (savedShareUrl) {
            await copyToClipboard(savedShareUrl);
        }
    }, [savedShareUrl, copyToClipboard]);

    // Open the collab URL in a new tab
    const handleOpenLink = useCallback(() => {
        if (savedShareUrl) {
            window.open(savedShareUrl, '_blank');
        }
    }, [savedShareUrl]);

    // Reset state when popover closes
    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            setSavedShareUrl(null);
            setSaveError(null);
            setCopied(false);
        }
    }, []);

    return (
        <Popover onOpenChange={handleOpenChange}>
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
                                Firebase:
                            </p>
                            <div className="rounded-md bg-muted p-2">
                                <code className="block text-[10px] leading-relaxed text-muted-foreground">
                                    VITE_FIREBASE_API_KEY
                                    <br />
                                    VITE_FIREBASE_AUTH_DOMAIN
                                    <br />
                                    VITE_FIREBASE_PROJECT_ID
                                    <br />
                                    VITE_FIREBASE_APP_ID
                                </code>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Agrégalas en{' '}
                                <strong>
                                    Netlify → Site Settings → Environment
                                    Variables
                                </strong>{' '}
                                y redespliega.
                            </p>
                        </div>
                    ) : !savedShareUrl ? (
                        /* ── Phase 1: Create the collab link ── */
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Share2 className="size-4 text-pink-500" />
                                    <h4 className="text-sm font-semibold">
                                        Compartir diagrama
                                    </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Crea un enlace colaborativo para que otros
                                    puedan editar este diagrama en tiempo real.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="collab-id-input"
                                    className="text-xs text-muted-foreground"
                                >
                                    Nombre del enlace (opcional)
                                </Label>
                                <Input
                                    id="collab-id-input"
                                    placeholder={defaultSlug}
                                    value={customId}
                                    onChange={(e) =>
                                        setCustomId(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                    disabled={isSaving}
                                />
                            </div>

                            {saveError && (
                                <p className="text-xs text-red-500">
                                    {saveError}
                                </p>
                            )}

                            <Button
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleCreateLink}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <Link className="size-3.5" />
                                )}
                                {isSaving
                                    ? 'Guardando diagrama...'
                                    : 'Crear enlace colaborativo'}
                            </Button>
                        </>
                    ) : (
                        /* ── Phase 2: Link created — show & copy ── */
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Check className="size-4 text-green-500" />
                                    <h4 className="text-sm font-semibold">
                                        ¡Enlace creado!
                                    </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    El enlace se copió al portapapeles.
                                    Compártelo con quien quieras que colabore.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Enlace para compartir
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        readOnly
                                        value={savedShareUrl}
                                        className="h-8 flex-1 text-xs"
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 px-2"
                                        onClick={handleCopyLink}
                                    >
                                        {copied ? (
                                            <Check className="size-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleOpenLink}
                            >
                                <ExternalLink className="size-3.5" />
                                Abrir en nueva pestaña
                            </Button>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};