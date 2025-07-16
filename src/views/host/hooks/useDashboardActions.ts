// src/views/host/hooks/useDashboardActions.ts - Enhanced with draft management
import {useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider';
import {useSupabaseMutation} from '@shared/hooks/supabase';
import {GameSession} from '@shared/types';
import {useGameSessionManagement} from '@shared/hooks/useGameSessionManagement';

interface NotificationState {
    type: 'error' | 'success';
    message: string;
}

interface CategorizedGames {
    draft: GameSession[];
    active: GameSession[];
    completed: GameSession[];
}

interface UseDashboardActionsReturn {
    notification: NotificationState | null;
    isDeleteModalOpen: boolean;
    gameToDelete: { id: string; name: string; type: 'draft' | 'active' | 'completed'} | null;
    isDeleting: boolean;
    deleteError: string | null;
    handleGameSelect: (sessionId: string, gameType: 'draft' | 'active' | 'completed') => void;
    handleResumeDraft: (sessionId: string, sessionName: string) => void;
    handleOpenDeleteModal: (sessionId: string, gameName: string, gameType: 'draft' | 'active' | 'completed') => void;
    handleConfirmDelete: () => Promise<void>;
    handleLogout: () => Promise<void>;
    dismissNotification: () => void;
    closeDeleteModal: () => void;
}

export const useDashboardActions = (
    games: CategorizedGames,
    refetchGames: () => Promise<CategorizedGames | null>
): UseDashboardActionsReturn => {
    const {signOut} = useAuth();
    const navigate = useNavigate();
    const {deleteSession} = useGameSessionManagement();

    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [gameToDelete, setGameToDelete] = useState<{
        id: string;
        name: string;
        type: 'draft' | 'active' | 'completed'
    } | null>(null);

    // Delete game mutation
    const {
        execute: deleteGameMutation,
        isLoading: isDeleting,
        error: deleteError
    } = useSupabaseMutation(
        async (gameId: string) => {
            return deleteSession(gameId);
        },
        {
            onSuccess: (_, gameId) => {
                const allGames = [...games.draft, ...games.active, ...games.completed];
                const deletedGame = allGames.find(g => g.id === gameId);
                const gameType = gameToDelete?.type === 'draft' ? 'draft' : 'active';

                setNotification({
                    type: 'success',
                    message: `${gameType === 'draft' ? 'Draft' : 'Active'} game "${deletedGame?.name || 'Unknown'}" deleted successfully.`
                });

                // Auto-dismiss success message
                setTimeout(() => setNotification(null), 4000);

                // Refresh the games list
                refetchGames();
            },
            onError: (error) => {
                console.error("DashboardActions: Error deleting game:", error);
                setNotification({type: 'error', message: error});
            }
        }
    );

    const handleGameSelect = useCallback((sessionId: string, gameType: 'draft' | 'active' | 'completed') => {
        if (gameType === 'draft') {
            // Draft games should resume creation
            handleResumeDraft(sessionId, 'Draft Game');
        } else if (gameType === 'completed') {
            // Completed games show report (not yet implemented)
            alert(`Navigating to report for completed game: ${sessionId} (Not yet implemented)`);
        } else {
            // Active games go to game
            navigate(`/host/${sessionId}`);
        }
    }, [navigate]);

    const handleResumeDraft = useCallback((sessionId: string, _sessionName: string) => {
        // Navigate to create-game with the draft session ID
        // The CreateGamePage will detect and load the existing draft
        navigate(`/create-game?resume=${sessionId}`);
    }, [navigate]);

    const handleOpenDeleteModal = useCallback((sessionId: string, gameName: string, gameType: 'draft' | 'active' | 'completed') => {
        setGameToDelete({id: sessionId, name: gameName, type: gameType});
        setNotification(null);
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!gameToDelete) return;

        await deleteGameMutation(gameToDelete.id);
        setIsDeleteModalOpen(false);
        setGameToDelete(null);
    }, [gameToDelete, deleteGameMutation]);

    const handleLogout = useCallback(async () => {
        try {
            await signOut();
            navigate('/login', {replace: true});
        } catch (error) {
            setNotification({
                type: 'error',
                message: error instanceof Error ? error.message : 'Logout failed'
            });
        }
    }, [signOut, navigate]);

    const dismissNotification = useCallback(() => {
        setNotification(null);
    }, []);

    const closeDeleteModal = useCallback(() => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setGameToDelete(null);
        }
    }, [isDeleting]);

    return {
        notification,
        isDeleteModalOpen,
        gameToDelete,
        isDeleting,
        deleteError,
        handleGameSelect,
        handleResumeDraft,
        handleOpenDeleteModal,
        handleConfirmDelete,
        handleLogout,
        dismissNotification,
        closeDeleteModal
    };
};
