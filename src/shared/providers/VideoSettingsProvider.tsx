// src/context/VideoSettingsContext.tsx
import React, {createContext, useEffect, useState, useCallback} from 'react';

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

export const VideoSettingsProvider: React.FC<VideoSettingsProviderProps> = ({
                                                                                children,
                                                                                sessionId
                                                                            }) => {
    const [settings, setSettings] = useState<VideoSettings>(defaultSettings);

    // Load settings from localStorage on mount
    useEffect(() => {
        const storageKey = sessionId ? `videoSettings_${sessionId}` : 'videoSettings_global';
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                const parsedSettings = JSON.parse(stored);
                setSettings(prev => ({...prev, ...parsedSettings}));
            } catch (error) {
                console.warn('Failed to parse stored video settings:', error);
            }
        }
    }, [sessionId]);

    // Save settings to localStorage when they change
    useEffect(() => {
        const storageKey = sessionId ? `videoSettings_${sessionId}` : 'videoSettings_global';
        localStorage.setItem(storageKey, JSON.stringify(settings));
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

    const contextValue: VideoSettingsContextType = {
        settings,
        updateSettings,
        toggleHostVideo,
    };

    return (
        <VideoSettingsContext.Provider value={contextValue}>
            {children}
        </VideoSettingsContext.Provider>
    );
};