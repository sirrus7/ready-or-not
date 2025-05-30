// src/components/Game/TeamLogin/components/ErrorDisplay.tsx - Error message display
import {AlertTriangle} from "lucide-react";

interface ErrorDisplayProps {
    loginError?: string;
    teamsError?: string | null;
    onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ loginError, teamsError, onRetry }) => {
    const error = loginError || teamsError;
    if (!error) return null;

    return (
        <div className="mb-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm flex items-start">
            <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0"/>
            <div>
                <span>{error}</span>
                {teamsError && onRetry && (
                    <button
                        onClick={onRetry}
                        className="block mt-2 text-xs text-red-200 underline hover:text-red-100 transition-colors"
                    >
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorDisplay;