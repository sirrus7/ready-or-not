// src/pages/DashboardPage/hooks/useDashboardActions.ts - Action handlers
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/AuthProvider';
import { useSupabaseMutation } from '@shared/hooks/supabase';
import { db } from '@shared/services/supabase';
import { GameSession } from '@shared/types/common';

interface NotificationState {
    type: 'error' | 'success';
    message: string;
}

interface UseDashboardActionsReturn {
    notification: NotificationState | null;
    isDeleteModalOpen: boolean;
    gameToDelete: { id: string; name: string } | null;
    isDeleting: boolean;
    deleteError: string | null;
    handleGameSelect: (sessionId: string) => void;
    handleOpenDeleteModal: (sessionId: string, gameName: string) => void;
    handleConfirmDelete: () => Promise<void>;
    handleLogout: () => Promise<void>;
    dismissNotification: () => void;
    closeDeleteModal: () => void;
}

export const useDashboardActions = (
    games: GameSession[],
    refetchGames: () => Promise<GameSession[] | null>
): UseDashboardActionsReturn => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null);

    // Delete game mutation
    const {
        execute: deleteGame,
        isLoading: isDeleting,
        error: deleteError
    } = useSupabaseMutation(
        async (gameId: string) => {
            return db.sessions.delete(gameId);
        },
        {
            onSuccess: (_, gameId) => {
                const deletedGame = games.find(g => g.id === gameId);
                setNotification({
                    type: 'success',
                    message: `Game "${deletedGame?.name || 'Unknown'}" deleted successfully.`
                });
                // Auto-dismiss success message
                setTimeout(() => setNotification(null), 4000);
                // Refresh the games list
                refetchGames();
            },
            onError: (error) => {
                console.error("DashboardActions: Error deleting game:", error);
                setNotification({ type: 'error', message: error });
            }
        }
    );

    const handleGameSelect = useCallback((sessionId: string) => {
        const selectedGame = games.find(g => g.id === sessionId);
        if (selectedGame) {
            if (selectedGame.is_complete) {
                alert(`Navigating to report for completed game: ${sessionId} (Not yet implemented)`);
            } else {
                navigate(`/classroom/${sessionId}`);
            }
        }
    }, [games, navigate]);

    const handleOpenDeleteModal = useCallback((sessionId: string, gameName: string) => {
        setGameToDelete({ id: sessionId, name: gameName });
        setNotification(null);
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!gameToDelete) return;

        await deleteGame(gameToDelete.id);
        setIsDeleteModalOpen(false);
        setGameToDelete(null);
    }, [gameToDelete, deleteGame]);

    const handleLogout = useCallback(async () => {
        try {
            await signOut();
            navigate('/login', { replace: true });
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
        handleOpenDeleteModal,
        handleConfirmDelete,
        handleLogout,
        dismissNotification,
        closeDeleteModal
    };
};
