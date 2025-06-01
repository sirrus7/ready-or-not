// src/components/Game/TeamLogin/components/ConnectionStatus.tsx - Connection indicator
interface ConnectionStatusIndicatorProps {
    isConnected: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({isConnected}) => {
    return (
        <div className="mt-2 text-center">
            <span className={`text-xs px-2 py-1 rounded-full ${
                isConnected
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-yellow-900/30 text-yellow-400'
            }`}>
                {isConnected ? '● Connected' : '● Connecting...'}
            </span>
        </div>
    );
};

export default ConnectionStatusIndicator;