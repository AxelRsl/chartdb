// src/components/collab-indicator/collab-indicator.tsx
import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';

export interface CollabIndicatorProps {
    collabId: string;
    isConnected: boolean;
}

export const CollabIndicator: React.FC<CollabIndicatorProps> = ({
    collabId,
    isConnected,
}) => {
    return (
        <div className="flex items-center gap-1.5 rounded-md border bg-secondary/50 px-2 py-1 text-xs">
            {isConnected ? (
                <Cloud className="size-3.5 text-green-500" />
            ) : (
                <CloudOff className="size-3.5 text-destructive" />
            )}
            <span className="max-w-[120px] truncate font-medium text-muted-foreground">
                {collabId}
            </span>
            <span
                className={`size-1.5 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-destructive'
                }`}
            />
        </div>
    );
};
