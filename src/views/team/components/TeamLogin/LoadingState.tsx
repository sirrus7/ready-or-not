// src/components/Game/TeamLogin/components/LoadingState.tsx - Loading display
import {Hourglass} from 'lucide-react';

interface LoadingStateProps {
    message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({message = "Loading available teams..."}) => {
    return (
        <div className="flex items-center justify-center p-4 my-4 bg-gray-600/50 rounded-md">
            <Hourglass size={20} className="animate-spin mr-2 text-sky-400"/>
            <span className="text-sky-300 text-sm">{message}</span>
        </div>
    );
};

export default LoadingState;