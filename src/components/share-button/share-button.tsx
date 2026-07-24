// src/components/share-button/share-button.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { Share2, Copy, Check, Link, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/button/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/popover/popover';
import { Input } from '@/components/input/input';
import { useChartDB } from '@/hooks/use-chartdb';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Label } from '@/components/label/label';

export const ShareButton: React.FC = () => {
    const { diagramName } = useChartDB();
    const [copied, setCopied] = useState(false);
    const [customId, setCustomId] = useState('');

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

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [shareUrl]);

    const handleOpenLink = useCallback(() => {
        window.location.href = shareUrl;
    }, [shareUrl]);

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
                                <strong>Netlify → Site Settings → Environment Variables</strong>{' '}
                                y redespliega.
                            </p>
                        </div>
                    ) : (
                        /* ── Firebase configured — share UI ── */
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Share2 className="size-4 text-pink-500" />
                                    <h4 className="text-sm font-semibold">
                                        Invitar editor
                                    </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Cualquier persona con este enlace podrá
                                    editar el diagrama en tiempo real.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="collab-id-input"
                                    className="text-xs text-muted-foreground"
                                >
                                    ID del diagrama colaborativo
                                </Label>
                                <Input
                                    id="collab-id-input"
                                    placeholder={defaultSlug}
                                    value={customId}
                                    onChange={(e) =>
                                        setCustomId(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Enlace para compartir
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        readOnly
                                        value={shareUrl}
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

                            <Button
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleOpenLink}
                            >
                                <Link className="size-3.5" />
                                Abrir en modo colaborativo
                            </Button>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
