// src/views/host/components/CreateGame/FinalizeStep.tsx
import React from 'react';
import {FinalizeStepProps} from './types';
import {ArrowLeft, Rocket, AlertTriangle, UsersIcon} from 'lucide-react';

const FinalizeStep: React.FC<FinalizeStepProps> = ({
                                                       gameData,
                                                       onNext, // This is now the finalize function
                                                       onPrevious,
                                                       isSubmitting,
                                                   }) => {
    return (
        <div className="space-y-6 text-gray-700">
            <div className="p-6 bg-green-50 border-l-4 border-green-500 rounded-md text-center shadow">
                <Rocket size={40} className="text-green-600 mx-auto mb-3"/>
                <h3 className="text-2xl font-bold text-green-700 mb-1">Almost There!</h3>
                <p className="text-gray-600 text-sm">
                    Please review your game session details below. Clicking "Finalize & Start Game" will create the
                    session, generate team access, and take you to the facilitator control panel.
                </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md">
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <h4 className="font-semibold text-gray-800 text-lg">Game Configuration Summary</h4>
                </div>

                <dl className="space-y-2.5 text-sm">
                    {[
                        {
                            label: "Game Name",
                            value: gameData.name || <span className="italic text-red-500">Not Set - Required!</span>
                        },
                        {
                            label: "Game Version",
                            value: gameData.game_version === '2.0_dd' ?
                                '2.0 with Double Down' : '1.5 with Double Down'
                        },
                        {
                            label: "Class / Group",
                            value: gameData.class_name || <span className="italic text-gray-400">Not Specified</span>
                        },
                        {
                            label: "Grade Level",
                            value: gameData.grade_level || <span className="italic text-gray-400">Not Specified</span>
                        },
                        {
                            label: "Number of Players",
                            value: gameData.num_players ||
                                <span className="italic text-red-500">0 - Min. 2 Required!</span>
                        },
                        {
                            label: "Number of Teams",
                            value: gameData.num_teams ||
                                <span className="italic text-red-500">0 - Min. 1 Required!</span>
                        },
                    ].map(item => (
                        <div key={item.label}
                             className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-b-0">
                            <dt className="font-medium text-gray-500">{item.label}:</dt>
                            <dd className="col-span-2 text-gray-800">{item.value}</dd>
                        </div>
                    ))}
                </dl>
                {(!gameData.name || gameData.num_players < 2 || gameData.num_teams < 1) && (
                    <div
                        className="mt-4 p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-xs flex items-center">
                        <AlertTriangle size={16} className="mr-2 flex-shrink-0 text-yellow-500"/>
                        Some required details are missing or invalid. Please go back and complete Step 1.
                    </div>
                )}
            </div>

            <div className="mt-3 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-700">
                <h5 className="font-semibold mb-1 flex items-center">
                    <UsersIcon size={16} className="mr-2"/> Team Setup Summary
                </h5>
                {gameData.teams_config && gameData.teams_config.length > 0 ? (
                    <p>
                        You have configured <strong
                        className="font-medium">{gameData.teams_config.length} teams</strong>.
                        Team names and passcodes were set up in Step 2.
                    </p>
                ) : gameData.num_teams > 0 ? (
                    <p>
                        <strong className="font-medium">{gameData.num_teams} teams</strong> will be created with default
                        names (Team A, Team B, etc.) and random passcodes.
                    </p>
                ) : (
                    <p className="italic text-sky-600">Team configuration will be based on the number of teams set in
                        Step 1.</p>
                )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
                Ensure all details are correct. Once finalized, you'll be redirected to manage the live game session.
            </p>

            <div className="mt-8 flex justify-between items-center">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50"
                >
                    <ArrowLeft size={18}/> Previous
                </button>
                <button
                    type="button"
                    onClick={onNext} // Now uses onNext instead of onFinalize
                    disabled={isSubmitting || !gameData.name || gameData.num_players < 2 || gameData.num_teams < 1}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[230px]"
                >
                    {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        <Rocket size={20}/>
                    )}
                    <span className="ml-1.5">{isSubmitting ? 'Creating Session...' : 'Finalize & Start Game'}</span>
                </button>
            </div>
        </div>
    );
};

export default FinalizeStep;
