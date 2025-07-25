// src/core/game/KpiDataUtils.ts
// NEW FILE: Shared utility functions to eliminate duplicate code

import {KpiEffect, PermanentKpiAdjustment, TeamRoundData} from '@shared/types';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';

export class KpiDataUtils {

    private static pendingRequests: Map<string, Promise<TeamRoundData>> = new Map<string, Promise<TeamRoundData>>();

    /**
     * Ensures team round data exists, creating it if necessary
     * This replaces the duplicate ensureTeamRoundData methods across engines
     */
    static async ensureTeamRoundData(
        sessionId: string,
        teamId: string,
        roundNumber: 1 | 2 | 3,
        teamRoundData: Record<string, Record<number, TeamRoundData>>,
        setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void
    ): Promise<TeamRoundData> {
        if (!sessionId || sessionId === 'new') {
            throw new Error("Invalid sessionId for KPI data.");
        }

        // CREATE A UNIQUE KEY for this request
        const requestKey = `${sessionId}-${teamId}-${roundNumber}`;

        // CHECK IF this exact request is already in progress
        if (this.pendingRequests.has(requestKey)) {
            console.log(`[KpiDataUtils] Reusing pending request for ${requestKey}`);
            return this.pendingRequests.get(requestKey)!;
        }

        // Check if data already exists in memory
        const existingKpis: TeamRoundData = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) {
            return existingKpis;
        }

        // CREATE a promise for this request and store it
        const requestPromise: Promise<TeamRoundData> = this.executeEnsureTeamRoundData(
            sessionId, teamId, roundNumber, teamRoundData, setTeamRoundDataDirectly
        );

        this.pendingRequests.set(requestKey, requestPromise);

        try {
            return await requestPromise;
        } finally {
            // CLEAN UP the pending request when done
            this.pendingRequests.delete(requestKey);
        }
    }

    // EXTRACT the actual logic into a separate method
    private static async executeEnsureTeamRoundData(
        sessionId: string,
        teamId: string,
        roundNumber: 1 | 2 | 3,
        teamRoundData: Record<string, Record<number, TeamRoundData>>,
        setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void
    ): Promise<TeamRoundData> {
        // Try to fetch existing data from database
        try {
            const existingData: TeamRoundData | null = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.warn(`[KpiDataUtils] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`, error);
        }

        // Create new round data with permanent adjustments applied
        const newRoundData: Omit<TeamRoundData, 'id'> = ScoringEngine.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            teamRoundData[teamId]
        );

        // Apply any existing permanent adjustments
        const adjustments: PermanentKpiAdjustment[] = await db.adjustments.getBySession(sessionId);
        const adjustedData: Omit<TeamRoundData, 'id'> = ScoringEngine.applyPermanentAdjustments(
            newRoundData,
            adjustments,
            teamId,
            roundNumber
        );

        try {
            // Insert into database
            const insertedData: TeamRoundData = await db.kpis.create(adjustedData);

            // Update local state
            setTeamRoundDataDirectly(prev => ({
                ...prev,
                [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
            }));

            return insertedData;
        } catch (error: any) {
            // HANDLE 409 conflicts gracefully - another request succeeded
            if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.status === 409) {
                console.log(`[KpiDataUtils] Record already exists for team ${teamId} round ${roundNumber}, fetching it`);

                // Fetch the existing record that was created by the other request
                const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
                if (existingData) {
                    setTeamRoundDataDirectly(prev => ({
                        ...prev,
                        [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                    }));
                    return existingData as TeamRoundData;
                }
            }

            // Re-throw other errors
            throw error;
        }
    }

    /**
     * BATCH VERSION: Updates local state for multiple teams at once
     * Much more efficient than individual updates
     */
    static updateTeamRoundDataBatch(
        teamRoundDataMap: Record<string, TeamRoundData>,
        roundNumber: number,
        setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void
    ): void {
        console.log(`[KpiDataUtils] Batch updating local state for ${Object.keys(teamRoundDataMap).length} teams`);

        setTeamRoundDataDirectly(prev => {
            const updated = {...prev};

            Object.entries(teamRoundDataMap).forEach(([teamId, teamData]) => {
                if (!updated[teamId]) updated[teamId] = {};
                updated[teamId][roundNumber] = teamData;
            });

            return updated;
        });

        console.log(`[KpiDataUtils] ✅ Batch state update complete`);
    }

    /**
     * Stores permanent adjustments with proper challenge tracking
     * FIXED: Now uses correct 5-parameter signature for createPermanentAdjustments
     */
    static async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        challengeId: string,
        optionId: string
    ): Promise<void> {
        const adjustmentsToUpsert = ScoringEngine.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            challengeId,  // ✅ FIXED: Now includes challengeId
            optionId      // ✅ FIXED: Now includes optionId
        );

        if (adjustmentsToUpsert.length > 0) {
            await db.adjustments.upsert(adjustmentsToUpsert);
        }
    }
}
