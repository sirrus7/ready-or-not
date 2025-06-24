// src/components/AuthGuard.tsx
import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider.tsx';

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({children}) => {
    const {user, loading} = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-700">Loading authentication...</p>
            </div>
        ); // Make sure this JSX block is correctly formed and closed.
    }
    if (!user) {
        // This is where the error was likely pointing due to a preceding issue or if this log itself has a problem
        return <Navigate to="/login" state={{from: location}} replace/>;
    }
    return <>{children}</>; // Using React Fragment just to be safe, can also be just children
};

export default AuthGuard;