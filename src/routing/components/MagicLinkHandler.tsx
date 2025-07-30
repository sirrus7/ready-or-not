// src/routing/components/MagicLinkHandler.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@app/providers/AuthProvider';
import { auth } from '@shared/services/supabase';

interface MagicLinkHandlerProps {
    fallbackPath?: string;
}

const MagicLinkHandler: React.FC<MagicLinkHandlerProps> = ({ fallbackPath = '/dashboard' }) => {
    const { user, loading } = useAuth();
    const [processingMagicLink, setProcessingMagicLink] = useState(false);
    const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

    useEffect(() => {
        const processMagicLink = async () => {
            // Check if URL contains magic link tokens
            const urlHash = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = urlHash.get('access_token');
            const refreshToken = urlHash.get('refresh_token');
            const authType = urlHash.get('type');

            console.log('🔗 MagicLinkHandler - Checking for tokens:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                authType: authType
            });

            // If no magic link tokens, proceed with normal routing
            if (!accessToken || !refreshToken || authType !== 'magiclink') {
                console.log('🔗 No magic link tokens found, proceeding with normal routing');
                return;
            }

            console.log('🔗 Magic link tokens detected! Processing...');
            setProcessingMagicLink(true);

            try {
                // Process the magic link tokens using your auth wrapper
                const data = await auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (data.user) {
                    console.log('✅ Magic link authentication successful!');
                    console.log('👤 User:', data.user.email);
                    console.log('👤 Metadata:', data.user.user_metadata);

                    // Clean the URL to remove tokens
                    const cleanUrl = window.location.pathname + window.location.search;
                    window.history.replaceState({}, document.title, cleanUrl);
                    console.log('🧹 URL cleaned after successful magic link authentication');
                } else {
                    console.warn('⚠️ Session was set but no user data received');
                    setMagicLinkError('Authentication succeeded but user data is missing');
                }
            } catch (error) {
                console.error('❌ Error processing magic link:', error);
                setMagicLinkError(`Failed to process authentication link: ${error.message}`);
            } finally {
                setProcessingMagicLink(false);
            }
        };

        processMagicLink();
    }, []); // Run once on mount

    // Show loading state while processing magic link
    if (processingMagicLink) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-700">Authenticating via magic link...</p>
                </div>
            </div>
        );
    }

    // Show error state if magic link processing failed
    if (magicLinkError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-8 text-center">
                    <div className="text-red-500 text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Failed</h2>
                    <p className="text-gray-600 mb-6">{magicLinkError}</p>
                    <p className="text-sm text-gray-500 mb-4">
                        Please request a new link from the Global Game Loader or try logging in manually.
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // If user is authenticated (either from magic link or existing session), go to dashboard
    if (user && !loading) {
        console.log('✅ User authenticated, redirecting to dashboard');
        return <Navigate to={fallbackPath} replace />;
    }

    // If still loading auth, show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-700">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // No user and not loading - redirect to login
    console.log('ℹ️ No user found, redirecting to login');
    return <Navigate to="/login" replace />;
};

export default MagicLinkHandler;