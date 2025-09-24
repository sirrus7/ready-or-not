// src/components/AuthGuard.tsx
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider.tsx';
import React from "react";

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = React.memo(({children}) => {
    const {user, loading} = useAuth();
    const location = useLocation();

    // SIMPLIFIED: No hasLoadedOnce state that could cause remounts
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500"></div>
                <p className="ml-3 text-gray-700">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        // In development, redirect to login page
        if (import.meta.env.DEV) {
            return <Navigate to="/login" state={{from: location}} replace/>;
        } else {
            // In production, redirect to marketplace login
            window.location.href = "https://platform.ron2game.com/login";
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div
                            className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500 mx-auto mb-4"></div>
                        <p className="text-gray-700">Redirecting to login...</p>
                    </div>
                </div>
            );
        }
    }

    // Remove the key prop that might be causing issues
    return <>{children}</>;
});

export default AuthGuard;