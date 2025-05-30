// src/components/Game/DecisionPanel/components/ErrorDisplay.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
    error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
    if (!error) return null;

    return (
        <div className="mt-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm">
            <AlertTriangle size={16} className="inline mr-2" /> {error}
        </div>
    );
};

export default ErrorDisplay;
