import React, { useEffect } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { Slide, Team, TeamDecision, TeamRoundData } from '@shared/types';

interface HostSyncComponentProps {
  sessionId: string | null;
  currentSlide: Slide | null;
  teamData?: {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    teamDecisions: TeamDecision[];
  };
  joinInfo?: {
    joinUrl: string;
    qrCodeDataUrl: string;
  } | null;
  isJoinInfoOpen?: boolean;
  onPresentationStatusChange?: (connected: boolean) => void;
  onPresentationVideoReady?: () => void;
}

export const HostSyncComponent: React.FC<HostSyncComponentProps> = ({
  sessionId,
  currentSlide,
  teamData,
  joinInfo,
  isJoinInfoOpen,
  onPresentationStatusChange,
  onPresentationVideoReady,
}) => {
  const broadcastManager = sessionId
    ? SimpleBroadcastManager.getInstance(sessionId, 'host')
    : null;

  // Monitor presentation connection status
  useEffect(() => {
    if (!broadcastManager || !onPresentationStatusChange) return;

    const unsubscribe = broadcastManager.onPresentationStatus((status) => {
      onPresentationStatusChange(status === 'connected');
    });

    return unsubscribe;
  }, [broadcastManager, onPresentationStatusChange]);

  // Listen for video ready messages from presentation
  useEffect(() => {
    if (!broadcastManager || !onPresentationVideoReady) return;

    broadcastManager.onPresentationVideoReady(onPresentationVideoReady);
  }, [broadcastManager, onPresentationVideoReady]);

  // Send slide updates to presentation
  useEffect(() => {
    if (!broadcastManager || !currentSlide) return;

    console.log('[HostSync] Sending slide update:', currentSlide.id);
    broadcastManager.sendSlideUpdate(currentSlide, teamData);
  }, [broadcastManager, currentSlide, teamData]);

  // Send join info updates
  useEffect(() => {
    if (!broadcastManager) return;

    if (isJoinInfoOpen && joinInfo) {
      console.log('[HostSync] Sending join info');
      broadcastManager.sendJoinInfo(joinInfo.joinUrl, joinInfo.qrCodeDataUrl);
    } else if (!isJoinInfoOpen) {
      console.log('[HostSync] Closing join info');
      broadcastManager.sendJoinInfoClose();
    }
  }, [broadcastManager, joinInfo, isJoinInfoOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (broadcastManager) {
        console.log('[HostSync] Destroying broadcast manager');
        broadcastManager.destroy();
      }
    };
  }, [broadcastManager]);

  // This component doesn't render anything - it just handles sync
  return null;
};