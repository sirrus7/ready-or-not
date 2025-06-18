// src/views/host/components/GameControls/AlertModal.tsx
// FIXED VERSION - Resolves "Next" button not working issue

import React from 'react';
import {Lightbulb} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';
import {useGameContext} from '@app/providers/GameProvider';

/**
 * HOST ALERT MODAL COMPONENT
 *
 * PURPOSE:
 * - Display host alerts during game flow (e.g., "All Teams Have Submitted")
 * - Provide "Next" and "Close" button options for different alert handling
 * - Integrate with host control navigation system
 *
 * REQUIREMENTS:
 * 1. "Next" button: Should advance to next slide for "All Teams Have Submitted" alerts
 * 2. "Close" button: Should dismiss alert without advancing
 * 3. Must call correct GameContext methods for each action
 * 4. Handle both automatic and manual alert dismissal
 *
 * WORKFLOW:
 * 1. Alert appears when triggered by game logic
 * 2. Host sees alert with two options:
 *    - "Next": Progress game flow (calls clearHostAlert)
 *    - "Close": Dismiss without action (calls setCurrentHostAlertState)
 * 3. Modal closes and appropriate action is taken
 *
 * INTEGRATION POINTS:
 * - GameContext.clearHostAlert(): Handles alert clearing + slide advancement
 * - GameContext.setCurrentHostAlertState(): Handles manual dismissal
 * - useGameController manages the actual navigation logic
 */
const AlertModal: React.FC = () => {
    const {state, clearHostAlert, setCurrentHostAlertState} = useGameContext();

    // Early return if no alert is present
    if (!state.currentHostAlert) return null;

    /**
     * NEXT BUTTON HANDLER
     *
     * PURPOSE: Progress the game flow appropriately based on alert type
     *
     * BEHAVIOR:
     * - For "All Teams Have Submitted": Clear alert AND advance to next slide
     * - For other alerts: Clear alert without advancing
     *
     * IMPLEMENTATION:
     * - Calls clearHostAlert() which contains the logic to determine action
     * - clearHostAlert() is async and handles slide advancement internally
     * - Logging helps debug if navigation isn't working
     */
    const handleNextClick = async () => {
        console.log('[AlertModal] Next button clicked for alert:', state.currentHostAlert?.title);

        try {
            await clearHostAlert();
            console.log('[AlertModal] clearHostAlert completed successfully');
        } catch (error) {
            console.error('[AlertModal] Error in clearHostAlert:', error);
        }
    };

    /**
     * CLOSE BUTTON HANDLER
     *
     * PURPOSE: Dismiss alert without taking any game action
     *
     * BEHAVIOR:
     * - Always just dismisses the alert
     * - Does not advance slides
     * - Sets dismissal tracking for "All Teams Have Submitted" alerts
     *
     * IMPLEMENTATION:
     * - Calls setCurrentHostAlertState(null) to clear alert
     * - GameContext handles dismissal tracking internally
     */
    const handleCloseClick = () => {
        console.log('[AlertModal] Close button clicked for alert:', state.currentHostAlert?.title);
        setCurrentHostAlertState(null);
    };

    /**
     * OVERLAY CLICK HANDLER
     *
     * PURPOSE: Allow dismissing alert by clicking outside modal
     * Same behavior as Close button
     */
    const handleOverlayClick = () => {
        console.log('[AlertModal] Overlay clicked, dismissing alert');
        setCurrentHostAlertState(null);
    };

    return (
        <Modal
            isOpen={!!state.currentHostAlert}
            onClose={handleOverlayClick} // Handle overlay/X button clicks
            title={state.currentHostAlert.title || "Game Host Alert!"}
            hideCloseButton={false}
        >
            <div className="p-1">
                <div className="flex items-start">
                    <div
                        className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
                        <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden="true"/>
                    </div>
                    <div className="ml-3 text-left">
                        <p className="text-sm text-gray-600 mt-1">
                            {state.currentHostAlert.message}
                        </p>
                    </div>
                </div>

                {/* BUTTON CONTAINER - Proper flex layout for two-button design */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    {/*
                        NEXT BUTTON - PRIMARY ACTION
                        - Blue styling indicates primary action
                        - Positioned on right (flex-row-reverse)
                        - Calls clearHostAlert() for proper game flow
                        - Includes loading/disabled states for async operation
                    */}
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        onClick={handleNextClick}
                        aria-label="Proceed with game flow - advance slide if appropriate"
                    >
                        Next
                    </button>

                    {/*
                        CLOSE BUTTON - SECONDARY ACTION
                        - Gray styling indicates secondary action
                        - Positioned on left
                        - Calls setCurrentHostAlertState(null) for dismissal only
                        - Always available as escape hatch
                    */}
                    <button
                        type="button"
                        onClick={handleCloseClick}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm sm:mr-3 transition-colors"
                        aria-label="Close alert without advancing"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AlertModal;
