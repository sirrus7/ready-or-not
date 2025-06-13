// src/views/host/components/AuthenticatedHostWrapper.tsx
import React from 'react';
import RonBotWidget from '@shared/components/RonBotWidget';

interface AuthenticatedHostWrapperProps {
    children: React.ReactNode;
    showChatbot?: boolean; // Allow specific pages to opt out if needed
}

const AuthenticatedHostWrapper: React.FC<AuthenticatedHostWrapperProps> = ({
                                                                               children,
                                                                               showChatbot = true
                                                                           }) => {
    return (
        <div className="relative">
            {children}
            {showChatbot && <RonBotWidget/>}
        </div>
    );
};

export default AuthenticatedHostWrapper;
