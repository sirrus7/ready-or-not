// src/app/providers/TeamGameProvider.tsx
// Lightweight GameProvider for team routes (no auth required)

import React, {createContext, useCallback, useContext} from 'react';
import {useParams} from 'react-router-dom';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {PermanentKpiAdjustment} from '@shared/types';

interface TeamGameContextType {
    sessionId: string | null;
    permanentAdjustments: PermanentKpiAdjustment[];
    isLoadingAdjustments: boolean;
    updatePermanentAdjustments: (adjustments: PermanentKpiAdjustment[]) => void;
}

const TeamGameContext = createContext<TeamGameContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useTeamGameContext = (): TeamGameContextType => {
    const context = useContext(TeamGameContext);
    if (!context) {
        throw new Error('useTeamGameContext must be used within a TeamGameProvider');
    }
    return context;
};

export const TeamGameProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string }>();

    // Use the centralized team data manager (no auth required)
    const teamDataManager = useTeamDataManager(sessionId || null);
    const {permanentAdjustments, isLoadingAdjustments} = teamDataManager;

    const updatePermanentAdjustments = useCallback((adjustments: PermanentKpiAdjustment[]) => {
        // This calls the existing setter from useTeamDataManager
        teamDataManager.setPermanentAdjustmentsDirectly(adjustments);
    }, [teamDataManager]);

    const contextValue: TeamGameContextType = {
        sessionId: sessionId || null,
        permanentAdjustments,
        isLoadingAdjustments,
        updatePermanentAdjustments
    };

    return (
        <TeamGameContext.Provider value={contextValue}>
            {children}
        </TeamGameContext.Provider>
    );
};
