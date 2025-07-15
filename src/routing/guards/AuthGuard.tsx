// src/components/AuthGuard.tsx
import React, {useEffect, useState} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider.tsx';

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = React.memo(({children}) => {
    console.log('🔍 [AUTHGUARD] Component re-rendering');
    const {user, loading} = useAuth();
    const location = useLocation();

    useEffect(() => {
        console.log('🏗️ [AUTHGUARD] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [AUTHGUARD] COMPONENT UNMOUNTED');
        };
    }, []);

    // CRITICAL: Only show loading on the VERY FIRST load, never transition back
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    useEffect(() => {
        if (!loading && !hasLoadedOnce) {
            setHasLoadedOnce(true);
        }
    }, [loading, hasLoadedOnce]);

    // If we've never finished loading, show loading screen
    if (!hasLoadedOnce && loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500"></div>
                <p className="ml-3 text-gray-700">Loading authentication...</p>
            </div>
        );
    }

    // Once loaded, if no user, redirect (but keep same structure)
    if (!user) {
        return <Navigate to="/login" state={{from: location}} replace/>;
    }

    // Always render children in consistent wrapper
    return (
        <div key="auth-wrapper">
            {children}
        </div>
    );
});

export default AuthGuard;