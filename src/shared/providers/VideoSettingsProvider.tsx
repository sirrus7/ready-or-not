// src/context/VideoSettingsContext.tsx
import React, {createContext, useEffect, useState, useCallback, useMemo} from 'react';

export interface VideoSettings {
    hostVideoEnabled: boolean;
    videoQuality: 'high' | 'medium' | 'low' | 'disabled';
    lastTestedAt: number | null;
    userOverride: boolean; // Whether user manually changed settings
}

interface VideoSettingsContextType {
    settings: VideoSettings;
    updateSettings: (updates: Partial<VideoSettings>) => void;
    toggleHostVideo: () => void;
}

const defaultSettings: VideoSettings = {
    hostVideoEnabled: true,
    videoQuality: 'high',
    lastTestedAt: null,
    userOverride: false
};

const VideoSettingsContext = createContext<VideoSettingsContextType | undefined>(undefined);

interface VideoSettingsProviderProps {
    children: React.ReactNode;
    sessionId?: string;
}

export const VideoSettingsProvider: React.FC<VideoSettingsProviderProps> = React.memo(({
                                                                                           children,
                                                                                           sessionId
                                                                                       }) => {
    console.log('🔍 [VIDEOSETTINGS] Component re-rendering');
    console.log('🔍 [VIDEOSETTINGS] Props:', {sessionId, children_type: typeof children});

    // In VideoSettingsProvider.tsx, add this useEffect:
    useEffect(() => {
        console.log('🏗️ [VIDEOSETTINGS] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [VIDEOSETTINGS] COMPONENT UNMOUNTED');
        };
    }, []);

    const [settings, setSettings] = useState<VideoSettings>(defaultSettings);
    console.log('🔍 [VIDEOSETTINGS] Current settings:', settings);

    // Load settings from localStorage on mount
    useEffect(() => {
        const storageKey = sessionId ? `videoSettings_${sessionId}` : 'videoSettings_global';
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                const parsedSettings = JSON.parse(stored);
                console.log('🔍 [VIDEOSETTINGS] Loaded settings:', parsedSettings);

                // 🎯 FIX: Only update if settings are actually different
                setSettings(prev => {
                    const newSettings = {...prev, ...parsedSettings};

                    // Compare the objects - only update if different
                    if (JSON.stringify(prev) === JSON.stringify(newSettings)) {
                        console.log('🔍 [VIDEOSETTINGS] Settings unchanged, skipping update');
                        return prev; // Return same reference to prevent re-render
                    }

                    console.log('🔍 [VIDEOSETTINGS] Settings changed, updating');
                    return newSettings;
                });
            } catch (error) {
                console.warn('Failed to parse stored video settings:', error);
            }
        }
    }, [sessionId]);

    // Save settings to localStorage when they change
    useEffect(() => {
        console.log('🔍 [VIDEOSETTINGS] Saving to localStorage:', settings);
        const storageKey = sessionId ? `videoSettings_${sessionId}` : 'videoSettings_global';

        // Only save if settings have actually changed from defaults or stored value
        const currentStored = localStorage.getItem(storageKey);
        const settingsToStore = JSON.stringify(settings);

        if (currentStored !== settingsToStore) {
            localStorage.setItem(storageKey, settingsToStore);
        }
    }, [settings, sessionId]);

    const updateSettings = useCallback((updates: Partial<VideoSettings>) => {
        setSettings(prev => ({
            ...prev,
            ...updates,
            userOverride: updates.hostVideoEnabled !== undefined ? true : prev.userOverride
        }));
    }, []);

    const toggleHostVideo = useCallback(() => {
        setSettings(prev => ({
            ...prev,
            hostVideoEnabled: !prev.hostVideoEnabled,
            userOverride: true
        }));
    }, []);

    const contextValue: VideoSettingsContextType = useMemo(() => ({
        settings,
        updateSettings,
        toggleHostVideo,
    }), [settings, updateSettings, toggleHostVideo]);

    return (
        <VideoSettingsContext.Provider value={contextValue}>
            {children}
        </VideoSettingsContext.Provider>
    );
});