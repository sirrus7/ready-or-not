// src/views/host/components/GameControls/AlertModal.tsx

import React from 'react';
import { HandPlatter, ClipboardCheck, PenLine, Lightbulb, X, CheckCircle2, Circle } from 'lucide-react';
import { useGameContext } from '@app/providers/GameProvider';
import { HostAlertCategory } from '@shared/types';

/**
 * Get visual properties for each alert category
 * 
 * ICON/IMAGE CHOICES:
 * - HandPlatter: Perfect for hand out materials (hand holding/presenting items) - OR CUSTOM IMAGE
 * - ClipboardCheck: Great for decisions (checkmarks imply completion/submission) - OR CUSTOM IMAGE
 * - PenLine: Ideal for writing/updating KPIs on documents
 * - Lightbulb: Standard for generic alerts/information
 */
const getAlertStyles = (category: HostAlertCategory, decisionHasFinished: boolean) => {
    switch (category) {
        case HostAlertCategory.HAND_OUT_MATERIALS:
            return {
                bgColor: 'bg-green-100',
                headerBg: 'bg-green-600',
                iconColor: 'text-white',
                borderColor: 'border-green-300',
                icon: HandPlatter, // Hand presenting/distributing items
                useCustomImage: true, // Flag to use custom image
                customImagePath: '/images/alert-handout.jpg', // Path to custom image
                buttonBg: 'bg-green-600 hover:bg-green-700',
                buttonRing: 'focus:ring-green-500'
            };
        case HostAlertCategory.DECISIONS:
            return {
                bgColor: decisionHasFinished ? 'bg-red-100' : 'bg-green-100',
                headerBg: decisionHasFinished ? 'bg-red-600' : 'bg-green-600',
                iconColor: 'text-white',
                borderColor: decisionHasFinished ? 'border-red-300' : 'border-green-300',
                icon: ClipboardCheck, // Clipboard with checkmark - decisions being completed
                useCustomImage: true, // Flag to use custom image
                customImagePath: '/images/alert-decisions.jpg', // Path to custom image
                buttonBg: decisionHasFinished ? 'bg-red-600 hover:bg-red-700': 'bg-green-600 hover:bg-green-700',
                buttonRing: decisionHasFinished ? 'focus:ring-green-500': 'focus:ring-green-500',
            };
        case HostAlertCategory.KPI_UPDATE:
            return {
                bgColor: 'bg-purple-100',
                headerBg: 'bg-purple-600',
                iconColor: 'text-white',
                borderColor: 'border-purple-300',
                icon: PenLine, // Pen writing on a line/document
                useCustomImage: false, // Uses icon
                buttonBg: 'bg-purple-600 hover:bg-purple-700',
                buttonRing: 'focus:ring-purple-500'
            };
        case HostAlertCategory.GENERIC:
        default:
            return {
                bgColor: 'bg-gray-100',
                headerBg: 'bg-gray-600',
                iconColor: 'text-white',
                borderColor: 'border-gray-300',
                icon: Lightbulb, // Classic lightbulb for ideas/information
                useCustomImage: false, // Uses icon
                buttonBg: 'bg-gray-600 hover:bg-gray-700',
                buttonRing: 'focus:ring-gray-500'
            };
    }
};

/**
 * HOST ALERT MODAL COMPONENT
 *

 */
const AlertModal: React.FC = () => {
    const { state, clearHostAlert, setCurrentHostAlertState } = useGameContext();

    // Early return if no alert is present
    if (!state.currentHostAlert) return null;

    // Get category (default to GENERIC if not specified)
    const category = state.currentHostAlert.category || HostAlertCategory.GENERIC;

    // Check if this is a decision alert and we should show team status
    const isDecisionAlert = category === HostAlertCategory.DECISIONS;
    
    // Calculate team submission status
    const teams = state.teams || [];
    const currentSlideData = state.gameStructure?.slides[state.current_slide_index ?? -1];
    const interactiveDataKey = currentSlideData?.interactive_data_key;
    
    const teamSubmissionStatus = teams.map(team => {
        const hasSubmitted = interactiveDataKey 
            ? !!(state.teamDecisions[team.id]?.[interactiveDataKey])
            : false;
        return {
            id: team.id,
            name: team.name,
            hasSubmitted
        };
    });

    const submittedCount = teamSubmissionStatus.filter(t => t.hasSubmitted).length;
    const totalCount = teamSubmissionStatus.length;

    const styles = getAlertStyles(category, totalCount !== submittedCount);
    const IconComponent = styles.icon;


    const handleNextClick = async () => {
        try {
            await clearHostAlert();
        } catch (error) {
            console.error('[AlertModal] Error in clearHostAlert:', error);
        }
    };

    const handleCloseClick = () => {
        setCurrentHostAlertState(null);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Only close if clicking the overlay itself, not the modal content
        if (e.target === e.currentTarget) {
            setCurrentHostAlertState(null);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Colored Header with Icon and Close Button */}
                <div className={`${styles.headerBg} px-8 py-8 flex items-center justify-between`}>
                    {/* Extra Large Icon or Custom Image */}
                    <div className="flex items-center gap-8">
                        {!styles.useCustomImage && (
                            <div className="flex-shrink-0 flex items-center justify-center h-32 w-32 rounded-full bg-white bg-opacity-30 shadow-lg overflow-hidden">
                                <IconComponent className={`h-16 w-16 ${styles.iconColor} stroke-[2.5]`} aria-hidden="true" strokeWidth={2.5} />
                            </div>
                        )}
                        {/* Title */}
                        <h3 className="text-5xl font-bold text-white drop-shadow-lg">
                            {state.currentHostAlert.title || "Game Host Alert!"}
                        </h3>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleCloseClick}
                        className="flex-shrink-0 p-3 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-8 w-8 text-white" />
                    </button>
                </div>

                {/* Content Section with Colored Background */}
                <div className={`${styles.bgColor} flex-1 overflow-y-auto`}>
                    <div className="px-8 py-8">
                        {/* Message Section */}
                        <div className={`bg-white rounded-lg p-8 shadow-md border-2 ${styles.borderColor}`}>
                            <p className="text-2xl text-gray-800 leading-relaxed">
                                {typeof state.currentHostAlert.message === 'string' ? state.currentHostAlert.message : state.currentHostAlert.message.map(line => (<span>{line}<br/></span>))}
                            </p>

                            {styles.useCustomImage && (                               
                                <img 
                                src={styles.customImagePath} 
                                alt={state.currentHostAlert.title}
                                className="h-full w-full object-cover"
                                />
                            )}
                            {/* Team Status Indicator - Only show for DECISIONS */}
                            {isDecisionAlert && totalCount > 0 && (
                                <div className="mt-8">
                                    <div className="mb-5 text-xl font-bold text-gray-800">
                                        Team Submissions: {submittedCount} of {totalCount}
                                    </div>
                                    <div className="flex flex-wrap gap-6">
                                        {teamSubmissionStatus.map(team => (
                                            <div key={team.id} className="flex flex-col items-center gap-2">
                                                <div className={`h-20 w-20 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                                                    team.hasSubmitted ? 'bg-green-500' : 'bg-gray-400'
                                                }`}>
                                                    {team.hasSubmitted ? (
                                                        <CheckCircle2 className="h-12 w-12" strokeWidth={2.5} />
                                                    ) : (
                                                        <Circle className="h-12 w-12" strokeWidth={2.5} />
                                                    )}
                                                </div>
                                                <span className="text-base font-semibold text-gray-800 text-center max-w-[90px] truncate">
                                                    {team.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Button Section */}
                <div className={`${styles.bgColor} px-8 py-4 border-t-2 ${styles.borderColor}`}>
                    <div className="flex flex-row-reverse gap-3">
                        {/* Next Button - Primary Action */}
                        <button
                            type="button"
                            className={`flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg border border-transparent shadow-lg px-8 py-3 ${styles.buttonBg} text-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-offset-2 ${styles.buttonRing} transition-all transform hover:scale-105`}
                            onClick={handleNextClick}
                            aria-label="Proceed with game flow - advance slide if appropriate"
                        >
                            Next
                        </button>

                        {/* Close Button - Secondary Action */}
                        <button
                            type="button"
                            onClick={handleCloseClick}
                            className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg border-2 border-gray-400 shadow-lg px-8 py-3 bg-white text-lg font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                            aria-label="Close alert without advancing"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;