// src/core/game/KpiDataUtils.ts
// NEW FILE: Shared utility functions to eliminate duplicate code

import {TeamRoundData, KpiEffect} from '@shared/types';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';

export class KpiDataUtils {
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

        console.log(`[KpiDataUtils] Ensuring KPI data exists for team ${teamId}, round ${roundNumber}`);

        // Check if data already exists in memory
        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) {
            return existingKpis;
        }

        // Try to fetch existing data from database
        try {
            const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log(`[KpiDataUtils] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
        }

        // Create new round data with permanent adjustments applied
        const newRoundData = ScoringEngine.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            teamRoundData[teamId]
        );

        // Apply any existing permanent adjustments
        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = ScoringEngine.applyPermanentAdjustments(
            newRoundData,
            adjustments,
            teamId,
            roundNumber
        );

        // Insert into database
        const insertedData = await db.kpis.create(adjustedData);

        // Update local state
        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        console.log(`[KpiDataUtils] ✅ Created new KPI data for team ${teamId} round ${roundNumber}`);
        return insertedData as TeamRoundData;
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
            console.log(`[KpiDataUtils] 💾 Storing ${adjustmentsToUpsert.length} permanent adjustments for team ${teamId}`);
            await db.adjustments.upsert(adjustmentsToUpsert);
            console.log(`[KpiDataUtils] ✅ Successfully stored permanent adjustments`);
        }
    }
}
