// src/components/Game/TeamLogout/index.tsx - Team logout component
import React, {useState} from 'react';
import {LogOut, AlertTriangle, Users} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';

interface TeamLogoutProps {
    teamName: string;
    sessionId: string;
    onLogout: () => void;
}

const TeamLogout: React.FC<TeamLogoutProps> = ({
                                                   teamName,
                                                   sessionId,
                                                   onLogout
                                               }) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleLogoutClick = () => {
        setShowConfirmModal(true);
    };

    const confirmLogout = () => {
        // Clear localStorage
        localStorage.removeItem(`ron_teamId_${sessionId}`);
        localStorage.removeItem(`ron_teamName_${sessionId}`);

        setShowConfirmModal(false);
        onLogout();
    };

    return (
        <>
            {/* Logout Button - Small, positioned in corner */}
            <button
                onClick={handleLogoutClick}
                className="fixed top-4 right-4 z-20 flex items-center gap-1 px-3 py-2 bg-red-600/90 hover:bg-red-700/90 text-white text-sm font-medium rounded-lg shadow-lg backdrop-blur-sm border border-red-500/30 transition-colors"
                title={`Logout from team ${teamName}`}
            >
                <LogOut size={14}/>
                <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Team Logout"
                size="sm"
            >
                <div className="p-2">
                    <div className="flex items-start">
                        <div
                            className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 sm:mx-0 sm:h-8 sm:w-8">
                            <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true"/>
                        </div>
                        <div className="ml-3 text-left">
                            <p className="text-sm text-gray-700 mt-0.5">
                                Are you sure you want to logout from team <strong
                                className="font-semibold">{teamName}</strong>?
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                You'll need to enter your team passcode again to rejoin the game.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm w-full sm:w-auto"
                            onClick={confirmLogout}
                        >
                            <LogOut className="h-4 w-4 mr-2"/>
                            Yes, Logout
                        </button>
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm w-full sm:w-auto"
                            onClick={() => setShowConfirmModal(false)}
                        >
                            <Users className="h-4 w-4 mr-2"/>
                            Stay Logged In
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TeamLogout;
