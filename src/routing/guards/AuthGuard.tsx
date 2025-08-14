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
        // In production, redirect to root instead of login
        if (import.meta.env.DEV) {
            return <Navigate to="/login" state={{from: location}} replace/>;
        } else {
            // In production, redirect to root (assumes magic link access)
            return <Navigate to="/" replace/>;
        }
    }

    // Remove the key prop that might be causing issues
    return <>{children}</>;
});

export default AuthGuard;