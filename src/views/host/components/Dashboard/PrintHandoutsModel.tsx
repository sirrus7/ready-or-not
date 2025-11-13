// src/views/host/components/Dashboard/PrintHandoutsModal.tsx
import React from 'react';
import Modal from '@shared/components/UI/Modal';
import { PrintHandoutsStep } from '../CreateGame';
import { NewGameData } from '@shared/types';


interface PrintHandoutsModalProps {
    gameData: NewGameData | null,
    isOpen: boolean,
    handleClose: () => void,
}

const PrintHandoutsModal = (props: PrintHandoutsModalProps) => {
    const {gameData, isOpen, handleClose} = props;

    if (!isOpen && gameData) return null;
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
                gameData={gameData!}
                hideFooter={true}
            />
        </Modal>
    );
};

export default PrintHandoutsModal;