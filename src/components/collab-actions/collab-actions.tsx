// src/components/collab-actions/collab-actions.tsx
import React, { useState } from 'react';
import { Button } from '@/components/button/button';
import { useFirebaseCollab } from '@/hooks/use-firebase-collab';
import { VersionHistoryDialog } from '@/dialogs/version-history-dialog/version-history-dialog';
import { Check, History, Loader2, LogIn, LogOut, Save, UserCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/tooltip/tooltip';

export const CollabActions: React.FC = () => {
    const {
        isCollabMode,
        collabId,
        hasUnsavedChanges,
        isSaving,
        saveToFirebase,
        isOwner,
        isCollaborator,
        user,
        loginGoogle,
        logoutGoogleAuth,
    } = useFirebaseCollab();

    const [historyOpen, setHistoryOpen] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleCommit = async () => {
        try {
            await saveToFirebase('Cambios aceptados');
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2500);
        } catch (error) {
            console.error('Error committing changes:', error);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await loginGoogle();
        } catch (error) {
            console.error('Google login error:', error);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="flex items-center gap-1.5">
            {/* ── Google Auth: always visible ── */}
            {user ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 px-2 text-xs"
                                onClick={logoutGoogleAuth}
                            >
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName ?? 'Google User'}
                                        className="size-4 rounded-full"
                                    />
                                ) : (
                                    <UserCheck className="size-3.5 text-pink-500" />
                                )}
                                <span className="max-w-[80px] truncate text-[11px] font-medium hidden sm:inline">
                                    {user.displayName?.split(' ')[0] ?? 'Creador'}
                                </span>
                                <LogOut className="size-3 opacity-60 ml-0.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            Conectado como {user.email} (Creador). Clic para cerrar sesión.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 px-2 text-xs border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                            >
                                {isLoggingIn ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <LogIn className="size-3.5" />
                                )}
                                <span className="hidden sm:inline">Iniciar sesión</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            Inicia sesión con Google para ser Creador y desbloquear todos los controles.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ── Role badge: only in collab mode ── */}
            {isCollabMode && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border">
                                {isOwner ? (
                                    <>
                                        <UserCheck className="size-3 text-pink-500" />
                                        <span>Creador</span>
                                    </>
                                ) : (
                                    <>
                                        <Users className="size-3 text-blue-500" />
                                        <span>Colaborador</span>
                                    </>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {isOwner
                                ? 'Eres el creador de este diagrama'
                                : 'Modo colaborador: Menú de nuevo/abrir restringido'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ── Collab-only controls: Commit button + History ── */}
            {isCollabMode && collabId && (
                <>
                    {/* Commit / Save changes button ("Aceptar cambios") */}
                    <Button
                        variant={hasUnsavedChanges ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 gap-1.5 text-xs font-medium transition-all ${
                            hasUnsavedChanges
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                                : ''
                        }`}
                        onClick={handleCommit}
                        disabled={isSaving || !hasUnsavedChanges}
                    >
                        {isSaving ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : justSaved ? (
                            <Check className="size-3.5 text-green-300" />
                        ) : (
                            <Save className="size-3.5" />
                        )}
                        {isSaving
                            ? 'Guardando...'
                            : justSaved
                            ? '¡Guardado!'
                            : hasUnsavedChanges
                            ? 'Aceptar cambios'
                            : 'Sin cambios'}
                    </Button>

                    {/* Version History Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setHistoryOpen(true)}
                        title="Historial de versiones (Git-like)"
                    >
                        <History className="size-3.5 text-pink-500" />
                        <span className="hidden md:inline">Historial</span>
                    </Button>

                    {/* History Modal Dialog */}
                    <VersionHistoryDialog
                        open={historyOpen}
                        onOpenChange={setHistoryOpen}
                        collabId={collabId}
                    />
                </>
            )}
        </div>
    );
};
