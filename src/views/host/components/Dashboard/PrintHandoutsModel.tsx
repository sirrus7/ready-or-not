// src/views/host/components/Dashboard/PrintHandoutsModal.tsx
import React, { useEffect, useState } from 'react';
import Modal from '@shared/components/UI/Modal';
import { PrintHandoutsStep } from '../CreateGame';
import { NewGameData } from '@shared/types';
import { useTeamDataManager } from '@shared/hooks/useTeamDataManager';
import { GameSessionManager } from '@core/game/GameSessionManager';


interface PrintHandoutsModalProps {
    sessionId: string | null,
    isOpen: boolean,
    handleClose: () => void,
}

const PrintHandoutsModal = (props: PrintHandoutsModalProps) => {
    const {sessionId, isOpen, handleClose} = props;

    if (!sessionId || !isOpen) {return null}

    const [gameData, setGameData] = useState<NewGameData | null>(null);

    const { 
        teams, 
        isLoadingTeams, 
        error: teamError 
    } = useTeamDataManager(sessionId);


    useEffect(() => {
        const loadSession = async () => {
            const sessionManager = GameSessionManager.getInstance();
            const sessionData = await sessionManager.loadSession(sessionId);
            setGameData({
                    game_version: sessionData.game_version,
                    name: sessionData.name,
                    class_name: sessionData.class_name || '',
                    grade_level: sessionData.grade_level || '',
                    num_players: 0,
                    num_teams: teams.length,
                    teams_config: teams.map(team => ({
                        name: team.name,
                        passcode: team.passcode
                    }))
            });
        }
        loadSession();
    }, [sessionId, teams])

    if (!gameData) {return null}
    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={"Print Handouts"}
            size="3xl"
        >
            <PrintHandoutsStep
                onNext={() => null}
                onPrevious={() => null}
                draftSessionId={null}
                gameData={gameData}
                hideSetup={true}
            />
        </Modal>
    );
};

export default PrintHandoutsModal;