// src/views/host/components/GamePanel.tsx
import React, {useState} from 'react';
import DecisionHistory from './DecisionHistory';
import HostGameControls from './GameControls';
import TeamSubmissions from './TeamMonitor';
import DecisionReviewModal from './DecisionReviewModal';
import {useGameContext} from '@app/providers/GameProvider';
import {Layers, Info, AlertTriangle} from 'lucide-react';

const GamePanel: React.FC = () => {
    const {state, currentSlideData, processInvestmentPayoffs, setCurrentHostAlertState} = useGameContext();
    const {gameStructure, currentSessionId, error: appError, isLoading} = state;

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingDecisionKey, setReviewingDecisionKey] = useState<string | null>(null);

    const isInteractiveStudentSlide = !!currentSlideData?.interactive_data_key;

    const handleReviewDecision = (decisionKey: string) => {
        setReviewingDecisionKey(decisionKey);
        setIsReviewModalOpen(true);
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setReviewingDecisionKey(null);
    };

    if (isLoading && !currentSessionId) {
        return <div className="bg-gray-100 p-6 ...">
            <div className="animate-spin ..."></div>
            Loading...</div>;
    }
    if (appError && !currentSessionId) {
        return <div className="bg-red-50 p-6 ..."><AlertTriangle/>Error Loading Session</div>;
    }
    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="bg-gray-100 p-6 ..."><Info/>No Active Game Session Loaded</div>;
    }

    const handlePayoffProcessing = async (roundNumber: 1 | 2 | 3) => {
        try {
            await processInvestmentPayoffs(roundNumber);
            setCurrentHostAlertState({title: 'Processing Complete', message: `Round ${roundNumber} payoffs applied.`});
        } catch (error) {
            console.error('[GamePanel] Failed to process investment payoffs:', error);
        }
    };

    return (
        <>
            <div className="bg-gray-50 h-full flex flex-col">
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
                    {/* REFACTOR: Restored the full header content here */}
                    <div className="flex items-center">
                        <Layers className="mr-2 text-blue-600" size={22}/>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">Host Control
                                Panel</h2>
                            <p className="text-xs text-gray-500 truncate">Session: {currentSessionId.substring(0, 12)}...</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 p-3">
                        <DecisionHistory onReviewDecision={handleReviewDecision}/>
                    </div>
                    {isInteractiveStudentSlide && (
                        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                            <div className="max-h-64 overflow-y-auto"><TeamSubmissions/></div>
                        </div>
                    )}
                    <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
                        {currentSlideData?.type === 'payoff_reveal' && currentSlideData.round_number > 0 && (
                            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <button
                                    onClick={() => handlePayoffProcessing(currentSlideData.round_number as 1 | 2 | 3)}
                                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                                    Process RD-{currentSlideData.round_number} Investment Payoffs
                                </button>
                                <p className="text-xs text-blue-600 mt-1 text-center">Click to apply investment effects
                                    to all teams</p>
                            </div>
                        )}
                        <HostGameControls/>
                    </div>
                </div>
            </div>

            <DecisionReviewModal
                isOpen={isReviewModalOpen}
                onClose={handleCloseReviewModal}
                decisionKey={reviewingDecisionKey}
            />
        </>
    );
};

export default GamePanel;
