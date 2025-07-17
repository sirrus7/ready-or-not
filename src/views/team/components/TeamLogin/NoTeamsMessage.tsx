// src/components/Game/TeamLogin/components/NoTeamsMessage.tsx - No teams available message
interface NoTeamsMessageProps {
    sessionId: string;
    onRefresh: () => void;
}

const NoTeamsMessage: React.FC<NoTeamsMessageProps> = ({sessionId, onRefresh}) => {
    return (
        <div className="text-center">
            <p className="text-yellow-400 text-sm my-4">
                No teams found for this session ID {sessionId}. Please ensure the Session ID in your URL is correct and that the
                facilitator has started the game.
            </p>
            <button
                onClick={onRefresh}
                className="text-sm text-blue-400 underline hover:text-blue-300 transition-colors"
            >
                Refresh teams list
            </button>
        </div>
    );
};

export default NoTeamsMessage;