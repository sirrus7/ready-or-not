// src/views/host/components/CreateGame/types.ts
import {NewGameData, TeamConfig} from '@shared/types';
import {UserType} from '@shared/constants/formOptions';

// Base interface that all wizard steps share
export interface BaseWizardStepProps {
    gameData: NewGameData;
    onNext: (...args: any[]) => void;
    onPrevious: () => void;
    draftSessionId: string | null;
    isSubmitting?: boolean;
    onDataChange?: (field: keyof NewGameData, value: any) => void;
}

// Specific step interfaces extending the base
export interface GameDetailsStepProps extends BaseWizardStepProps {
    onDataChange: (field: keyof NewGameData, value: any) => void; // Required for this step
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    userType?: UserType;
}

export interface TeamSetupStepProps extends BaseWizardStepProps {
    onDataChange: (field: keyof NewGameData, value: TeamConfig[]) => void; // Required for this step
    onNext: (dataFromStep: Partial<NewGameData>) => void;
}

export interface RoomSetupStepProps extends BaseWizardStepProps {
    onNext: () => void;
}

export interface PrintHandoutsStepProps extends BaseWizardStepProps {
    onNext: () => void;
    hideFooter: boolean
}

export interface MediaDownloadStepProps extends BaseWizardStepProps {
    userType: UserType;
    onNext: () => void;
}

export interface FinalizeStepProps extends BaseWizardStepProps {
    onNext: () => void;
}
