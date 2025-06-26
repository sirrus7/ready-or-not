// src/core/game/GameSessionManager.ts - COMPLETE VERSION
import {GameStructure, GameSession, GameSessionInsert, NewGameData, TeamRoundData} from '@shared/types';
import {db, formatSupabaseError} from '@shared/services/supabase';
import { ScoringEngine } from './ScoringEngine';
import {SimpleRealtimeManager} from "@core/sync";

export class GameSessionManager {
    private static instance: GameSessionManager;

    private constructor() {
    }

    static getInstance(): GameSessionManager {
        if (!GameSessionManager.instance) {
            GameSessionManager.instance = new GameSessionManager();
        }
        return GameSessionManager.instance;
    }

    async createDraftSession(
        hostId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        const firstSlide = fullGameStructure.slides[0];
        if (!firstSlide) {
            throw new Error("Game structure is missing slides, cannot create draft session.");
        }

        const draftSessionToInsert: GameSessionInsert = {
            name: `Draft Game - ${new Date().toLocaleDateString()}`,
            host_id: hostId,
            status: 'draft',
            game_version: '2.0_dd',
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            host_notes: {},
            wizard_state: {},
            class_name: null,
            grade_level: null,
        };

        try {
            const newDraftSession = await db.sessions.create(draftSessionToInsert);
            if (!newDraftSession || !newDraftSession.id) {
                throw new Error("Failed to create draft session record or retrieve its ID.");
            }
            return newDraftSession as GameSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error creating draft session:", error);
            throw new Error(`Failed to create draft session: ${errorMessage}`);
        }
    }

    async updateWizardState(sessionId: string, wizardState: Partial<NewGameData>): Promise<void> {
        try {
            await this.updateSession(sessionId, {wizard_state: wizardState});
        } catch (error) {
            console.error(`[GameSessionManager] Error updating wizard state:`, error);
            throw new Error(`Failed to save wizard progress: ${formatSupabaseError(error)}`);
        }
    }

    async finalizeDraftSession(
        sessionId: string,
        finalGameData: NewGameData
    ): Promise<GameSession> {
        try {
            const updatedSession = await this.updateSession(sessionId, {
                status: 'active',
                name: finalGameData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
                class_name: finalGameData.class_name?.trim() || null,
                grade_level: finalGameData.grade_level || null,
                game_version: finalGameData.game_version,
                wizard_state: null,
            });

            const teamsToCreate = finalGameData.teams_config || [];
            if (teamsToCreate.length > 0) {
                // Create teams first
                const createdTeams = await Promise.all(teamsToCreate.map(teamConfig =>
                    db.teams.create({
                        session_id: sessionId,
                        name: teamConfig.name,
                        passcode: teamConfig.passcode
                    })
                ));

                // Initialize KPI data for all teams in Round 1
                await Promise.all(createdTeams.map(async (team) => {
                    // Create baseline Round 1 KPI data using existing utility
                    const baselineKpis = ScoringEngine.createNewRoundData(
                        sessionId,
                        team.id,
                        1 // Start with Round 1
                    );

                    // Create temporary object with id for financial metrics calculation
                    const kpiWithId = { ...baselineKpis, id: 'temp' } as TeamRoundData;
                    const financialMetrics = ScoringEngine.calculateFinancialMetrics(kpiWithId);

                    // Insert initial KPI data into database
                    await db.kpis.create({
                        ...baselineKpis,
                        ...financialMetrics
                    });
                }));
            }

            return updatedSession;
        } catch (error) {
            throw new Error(`Failed to finalize game: ${formatSupabaseError(error)}`);
        }
    }

    async getLatestDraftForHost(hostId: string): Promise<GameSession | null> {
        try {
            const sessions = await db.sessions.getByHost(hostId);
            const draftSessions = sessions.filter(s => (s as any).status === 'draft');
            if (draftSessions.length > 0) {
                return draftSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as GameSession;
            }
            return null;
        } catch (error) {
            console.error(`[GameSessionManager] Error getting latest draft:`, error);
            throw new Error(`Failed to get latest draft: ${formatSupabaseError(error)}`);
        }
    }

    async checkForExistingDraft(hostId: string): Promise<GameSession | null> {
        try {
            const sessions = await db.sessions.getByHost(hostId);
            const draftSessions = sessions.filter(s => (s as any).status === 'draft');
            if (draftSessions.length > 0) {
                return draftSessions[0] as GameSession;
            }
            return null;
        } catch (error) {
            console.error(`[GameSessionManager] Error checking for draft sessions:`, error);
            throw new Error(`Failed to check for existing drafts: ${formatSupabaseError(error)}`);
        }
    }

    async getCategorizedSessionsForHost(hostId: string): Promise<{
        draft: GameSession[];
        active: GameSession[];
        completed: GameSession[];
    }> {
        try {
            const allSessions = await db.sessions.getByHost(hostId);
            return {
                draft: allSessions.filter(s => (s as any).status === 'draft'),
                active: allSessions.filter(s => (s as any).status === 'active' && !s.is_complete),
                completed: allSessions.filter(s => (s as any).status === 'completed' || s.is_complete),
            } as any;
        } catch (error) {
            console.error(`[GameSessionManager] Error fetching categorized sessions:`, error);
            throw new Error(`Failed to fetch sessions: ${formatSupabaseError(error)}`);
        }
    }

    async createSession(
        gameCreationData: NewGameData,
        hostId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Attempting to create new session...");

        const firstSlide = fullGameStructure.slides[0];
        if (!firstSlide) {
            throw new Error("Game structure is missing slides, cannot create session.");
        }

        const sessionToInsert: GameSessionInsert = {
            name: gameCreationData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
            host_id: hostId,
            status: 'active',
            class_name: gameCreationData.class_name?.trim() || null,
            grade_level: gameCreationData.grade_level || null,
            game_version: gameCreationData.game_version,
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            host_notes: {},
            wizard_state: null,
        };

        try {
            const newSession = await db.sessions.create(sessionToInsert);
            if (!newSession || !newSession.id) {
                throw new Error("Failed to create game session record or retrieve its ID.");
            }
            const teamsToCreate = gameCreationData.teams_config || [];
            if (teamsToCreate.length > 0) {
                await Promise.all(teamsToCreate.map(teamConfig =>
                    db.teams.create({session_id: newSession.id, name: teamConfig.name, passcode: teamConfig.passcode})
                ));
            } else if (gameCreationData.num_teams > 0) {
                const defaultTeamsPromises = Array.from({length: gameCreationData.num_teams}).map((_, i) =>
                    db.teams.create({
                        session_id: newSession.id,
                        name: `Team ${String.fromCharCode(65 + i)}`,
                        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
                    })
                );
                await Promise.all(defaultTeamsPromises);
            }
            return newSession as GameSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error creating session and/or teams:", error);
            throw new Error(`Failed to create game session: ${errorMessage}`);
        }
    }

    async loadSession(sessionId: string): Promise<GameSession> {
        try {
            const sessionData = await db.sessions.getById(sessionId);
            if (!sessionData) throw new Error(`Session with ID '${sessionId}' not found.`);
            return sessionData as GameSession;
        } catch (error) {
            throw new Error(`Failed to load session: ${formatSupabaseError(error)}`);
        }
    }

    async updateSession(sessionId: string, updates: Partial<GameSessionInsert>): Promise<GameSession> {
        if (!sessionId || sessionId === 'new') {
            throw new Error('Cannot update session: Invalid session ID');
        }
        try {
            const updatedSession = await db.sessions.update(sessionId, updates);
            if (!updatedSession) throw new Error(`Failed to update session with ID '${sessionId}'.`);
            return updatedSession as GameSession;
        } catch (error) {
            throw new Error(`Failed to save session progress: ${formatSupabaseError(error)}`);
        }
    }

    async deleteSession(sessionId: string): Promise<void> {
        try {
            // NEW: Broadcast session deletion
            try {
                const realtimeManager = SimpleRealtimeManager.getInstance(sessionId, 'host');
                realtimeManager.sendGameEnded();
            } catch (broadcastError) {
                console.warn('[GameSessionManager] Failed to broadcast session deletion:', broadcastError);
            }

            await db.sessions.delete(sessionId);
        } catch (error) {
            throw new Error(`Failed to delete session: ${formatSupabaseError(error)}`);
        }
    }

    async getSessionsForHost(hostId: string): Promise<GameSession[]> {
        try {
            const sessions = await db.sessions.getByHost(hostId);
            return sessions as GameSession[];
        } catch (error) {
            throw new Error(`Failed to fetch sessions: ${formatSupabaseError(error)}`);
        }
    }

    async resetSessionProgress(sessionId: string): Promise<GameSession> {
        return this.updateSession(sessionId, {
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            host_notes: {},
            status: 'active',
            wizard_state: null,
        });
    }

    async completeSession(sessionId: string): Promise<GameSession> {
        return this.updateSession(sessionId, {
            is_complete: true,
            is_playing: false,
            status: 'completed'
        });
    }

    async updateHostNotes(sessionId: string, notes: Record<string, string>): Promise<GameSession> {
        return this.updateSession(sessionId, {host_notes: notes});
    }

    async validateSession(sessionId: string): Promise<boolean> {
        try {
            await this.loadSession(sessionId);
            return true;
        } catch {
            return false;
        }
    }

    async getSessionStatus(sessionId: string): Promise<{
        exists: boolean;
        status: 'draft' | 'active' | 'completed' | null;
        isComplete: boolean;
        currentPhase: string | null;
        lastUpdated: string;
    }> {
        try {
            const session = await this.loadSession(sessionId);
            return {
                exists: true,
                status: (session as any).status || 'active',
                isComplete: session.is_complete,
                currentPhase: session.current_slide_index?.toString() ?? null,
                lastUpdated: session.updated_at
            };
        } catch {
            return {exists: false, status: null, isComplete: false, currentPhase: null, lastUpdated: ''};
        }
    }
}
