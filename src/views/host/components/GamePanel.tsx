// src/views/host/components/GamePanel.tsx
// Updated to use the new TeamSubmissions component

import React, {useState, useEffect} from 'react';
import DecisionHistory from './DecisionHistory';
import HostGameControls from './GameControls';
import TeamMonitor from './TeamMonitor';
import DecisionReviewModal from './DecisionReviewModal';
import {useGameContext} from '@app/providers/GameProvider';
import {Layers, Info, AlertTriangle, History, ListChecks} from 'lucide-react';

const GamePanel: React.FC = () => {
    const {state, currentSlideData} = useGameContext();
    const {gameStructure, currentSessionId, error: appError, isLoading} = state;

    const [activeTab, setActiveTab] = useState<'timeline' | 'submissions'>('timeline');
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingDecisionKey, setReviewingDecisionKey] = useState<string | null>(null);

    const isInteractiveStudentSlide = !!(currentSlideData?.interactive_data_key) &&
        currentSlideData?.type !== 'double_down_dice_roll';

    // Automatically switch tabs based on slide type
    useEffect(() => {
        if (isInteractiveStudentSlide) {
            setActiveTab('submissions');
        } else {
            setActiveTab('timeline');
        }
    }, [isInteractiveStudentSlide]);

    const handleReviewDecision = (decisionKey: string) => {
        setReviewingDecisionKey(decisionKey);
        setIsReviewModalOpen(true);
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setReviewingDecisionKey(null);
    };

    if (isLoading && !currentSessionId) {
        return <div className="bg-gray-100 p-6 rounded-lg shadow-md flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-orange-500 mr-3"></div>
            Loading...</div>;
    }
    if (appError && !currentSessionId) {
        return <div className="bg-red-50 p-6 rounded-lg shadow-md flex items-center h-full text-red-700"><AlertTriangle
            className="mr-3"/>Error Loading Session</div>;
    }
    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="bg-gray-100 p-6 rounded-lg shadow-md flex items-center h-full text-gray-500"><Info
            className="mr-3"/>No Active Game Session Loaded</div>;
    }

    return (
        <>
            <div className="bg-white h-full flex flex-col rounded-lg overflow-hidden shadow-lg border border-gray-200">
                {/* Panel Header */}
                <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center">
                        <Layers className="mr-2 text-game-orange-600" size={22}/>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">Host Control Panel</h2>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex-shrink-0 border-b border-gray-200 flex">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                            activeTab === 'timeline' ?
                                'bg-white text-game-orange-600 border-b-2 border-game-orange-600' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <History size={16}/>
                        Decision Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        disabled={!isInteractiveStudentSlide}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'submissions' ? 'bg-white text-game-orange-600 border-b-2 border-game-orange-600' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <ListChecks size={16}/>
                        Submissions
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
                    {activeTab === 'timeline' && (
                        <div className="p-3">
                            <DecisionHistory onReviewDecision={handleReviewDecision}/>
                        </div>
                    )}
                    {activeTab === 'submissions' && isInteractiveStudentSlide && (
                        <TeamMonitor/>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
                    <HostGameControls/>
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
