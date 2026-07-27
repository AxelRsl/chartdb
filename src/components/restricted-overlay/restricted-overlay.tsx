// src/components/restricted-overlay/restricted-overlay.tsx
import React, { useState } from 'react';
import { useFirebaseCollab } from '@/hooks/use-firebase-collab';
import { Button } from '@/components/button/button';
import { Lock, LogIn, Loader2, Mail } from 'lucide-react';

export const RestrictedOverlay: React.FC = () => {
    const { isRestricted, loginGoogle } = useFirebaseCollab();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    if (!isRestricted) {
        return null;
    }

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await loginGoogle();
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/70 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
            <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card/90 p-8 shadow-2xl backdrop-blur-xl">
                {/* Lock icon badge */}
                <div className="flex size-16 items-center justify-center rounded-full bg-pink-500/10 text-pink-500 ring-8 ring-pink-500/5">
                    <Lock className="size-8" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                        Diagrama Bloqueado
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Si necesitas crear un diagrama contacta a{' '}
                        <a
                            href="mailto:axel041219@gmail.com"
                            className="font-medium text-pink-500 underline underline-offset-2 hover:text-pink-600"
                        >
                            axel041219@gmail.com
                        </a>
                    </p>
                </div>

                <div className="mt-2 flex w-full flex-col gap-2">
                    <Button
                        size="lg"
                        className="w-full gap-2 bg-pink-600 font-semibold text-white hover:bg-pink-700 dark:bg-pink-600 dark:hover:bg-pink-500"
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <LogIn className="size-4" />
                        )}
                        Iniciar sesión como Creador (Google)
                    </Button>

                    <a
                        href="mailto:axel041219@gmail.com"
                        className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Mail className="size-3.5" />
                        Contactar al creador
                    </a>
                </div>
            </div>
        </div>
    );
};
