// src/shared/hooks/useSignedMediaUrl.ts
import {useState, useEffect} from 'react';
import {mediaManager} from '@shared/services/MediaManager';
import {getUserType, UserType} from '@shared/constants/formOptions';
import {useAuth} from '@app/providers/AuthProvider';

interface SignedMediaUrlState {
    url: string | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * A React hook to get a dynamic, cached, signed URL for a media asset.
 * @param sourcePath The file name of the asset (e.g., 'slide_001.jpg').
 * @param gameVersion The game version for slide fallback logic
 * @returns An object containing the URL, loading state, and any errors.
 */
export const useSignedMediaUrl = (sourcePath: string | undefined, gameVersion?: string): SignedMediaUrlState => {
    const [state, setState] = useState<SignedMediaUrlState>({
        url: null,
        isLoading: false,
        error: null,
    });
    const {user} = useAuth();
    const userType: UserType = getUserType(user);

    useEffect(() => {
        // If there's no path, do nothing.
        if (!sourcePath) {
            setState({url: null, isLoading: false, error: null});
            return;
        }

        let isMounted: boolean = true;

        const fetchUrl = async () => {
            setState({url: null, isLoading: true, error: null});
            try {
                const signedUrl: string = await mediaManager.getSignedUrlWithFallback(sourcePath, userType, gameVersion);
                if (isMounted) {
                    setState({url: signedUrl, isLoading: false, error: null});
                }
            } catch (err) {
                if (isMounted) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load media';
                    console.error(`[useSignedMediaUrl] Error for path ${sourcePath}:`, errorMessage);
                    setState({url: null, isLoading: false, error: errorMessage});
                }
            }
        };

        fetchUrl();

        return () => {
            isMounted = false;
        };
    }, [sourcePath, userType, gameVersion]); // Re-run when sourcePath OR userType changes.

    return state;
};
