// src/components/share-button/share-button.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { Share2, Copy, Check, Link } from 'lucide-react';
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

    if (!firebaseReady) {
        return null;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    id="share-diagram-button"
                >
                    <Share2 className="size-3.5" />
                    <span className="hidden sm:inline">Compartir</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold">
                            Compartir diagrama
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Comparte este enlace con tu equipo para colaborar en
                            tiempo real.
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
                            onChange={(e) => setCustomId(e.target.value)}
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
                </div>
            </PopoverContent>
        </Popover>
    );
};
