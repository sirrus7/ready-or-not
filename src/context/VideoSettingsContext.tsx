// src/context/VideoSettingsContext.tsx
import React, {createContext, useContext, useEffect, useState, useCallback} from 'react';
import {BandwidthTestResult} from '../utils/bandwidthTest';

export interface VideoSettings {
    hostVideoEnabled: boolean;
    videoQuality: 'high' | 'medium' | 'low' | 'disabled';
    bandwidthTestResult: BandwidthTestResult | null;
    lastTestedAt: number | null;
    userOverride: boolean; // Whether user manually changed settings
}

interface VideoSettingsContextType {
    settings: VideoSettings;
    updateSettings: (updates: Partial<VideoSettings>) => void;
    toggleHostVideo: () => void;
    needsBandwidthTest: boolean;
    isVideoRecommended: boolean;
    getVideoRecommendation: () => string;
}

const defaultSettings: VideoSettings = {
    hostVideoEnabled: true,
    videoQuality: 'high',
    bandwidthTestResult: null,
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

    // Determine if bandwidth test is needed (older than 1 hour or never tested)
    const needsBandwidthTest = !settings.lastTestedAt ||
        (Date.now() - settings.lastTestedAt) > (60 * 60 * 1000);

    // Determine if video is recommended based on bandwidth test
    const isVideoRecommended = settings.bandwidthTestResult?.canHandleVideo ?? true;

    const getVideoRecommendation = useCallback((): string => {
        if (!settings.bandwidthTestResult) {
            return "Run a bandwidth test to get personalized recommendations.";
        }

        const {quality, recommendation} = settings.bandwidthTestResult;

        if (quality === 'poor' && settings.hostVideoEnabled && !settings.userOverride) {
            return `⚠️ ${recommendation}`;
        } else if (quality === 'fair' && settings.hostVideoEnabled && !settings.userOverride) {
            return `💡 ${recommendation}`;
        } else if (quality === 'good') {
            return `✅ ${recommendation}`;
        } else if (quality === 'excellent') {
            return `🚀 ${recommendation}`;
        }

        return recommendation;
    }, [settings.bandwidthTestResult, settings.hostVideoEnabled, settings.userOverride]);

    // Auto-adjust settings based on bandwidth test results (only if user hasn't overridden)
    useEffect(() => {
        if (settings.bandwidthTestResult && !settings.userOverride) {
            const {canHandleVideo, quality} = settings.bandwidthTestResult;

            const newSettings: Partial<VideoSettings> = {};

            if (!canHandleVideo && settings.hostVideoEnabled) {
                newSettings.hostVideoEnabled = false;
            }

            // Adjust quality based on connection
            if (quality === 'poor') {
                newSettings.videoQuality = 'disabled';
                newSettings.hostVideoEnabled = false;
            } else if (quality === 'fair') {
                newSettings.videoQuality = 'low';
            } else if (quality === 'good') {
                newSettings.videoQuality = 'medium';
            } else if (quality === 'excellent') {
                newSettings.videoQuality = 'high';
            }

            if (Object.keys(newSettings).length > 0) {
                setSettings(prev => ({...prev, ...newSettings}));
            }
        }
    }, [settings.bandwidthTestResult, settings.userOverride, settings.hostVideoEnabled]);

    const contextValue: VideoSettingsContextType = {
        settings,
        updateSettings,
        toggleHostVideo,
        needsBandwidthTest,
        isVideoRecommended,
        getVideoRecommendation
    };

    return (
        <VideoSettingsContext.Provider value={contextValue}>
            {children}
        </VideoSettingsContext.Provider>
    );
};