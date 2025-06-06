// src/core/game/GameSessionManager.ts
import {GameStructure, GameSession, NewGameData} from '@shared/types';
import {db, formatSupabaseError} from '@shared/services/supabase';

export interface SessionUpdatePayload {
    // REFACTOR: Changed to current_slide_index
    current_slide_index?: number | null;
    is_playing?: boolean;
    teacher_notes?: Record<string, string>;
    is_complete?: boolean;
    name?: string;
    class_name?: string | null;
    grade_level?: string | null;
    game_version?: '2.0_dd' | '1.5_dd';
    status?: 'draft' | 'active' | 'completed';
    wizard_state?: Partial<NewGameData> | null;
}

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
        teacherId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Creating new draft session...");

        // REFACTOR: Use the flat slides array instead of welcome_phases
        const firstSlide = fullGameStructure.slides[0];
        if (!firstSlide) {
            throw new Error("Game structure is missing slides, cannot create draft session.");
        }

        const draftSessionToInsert = {
            name: `Draft Game - ${new Date().toLocaleDateString()}`,
            teacher_id: teacherId,
            status: 'draft' as const,
            game_version: '2.0_dd' as const,
            // REFACTOR: Set current_slide_index to 0
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
            wizard_state: {},
            class_name: null,
            grade_level: null,
        };

        try {
            const newDraftSession = await db.sessions.create(draftSessionToInsert);
            if (!newDraftSession || !newDraftSession.id) {
                throw new Error("Failed to create draft session record or retrieve its ID.");
            }
            console.log(`[GameSessionManager] Draft session created: ${newDraftSession.id}`);
            return newDraftSession as GameSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error creating draft session:", error);
            throw new Error(`Failed to create draft session: ${errorMessage}`);
        }
    }

    async updateWizardState(sessionId: string, wizardState: Partial<NewGameData>): Promise<void> {
        console.log(`[GameSessionManager] Updating wizard state for session ${sessionId}`);
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
        console.log(`[GameSessionManager] Finalizing draft session: ${sessionId}`);
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
                await Promise.all(teamsToCreate.map(teamConfig =>
                    db.teams.create({session_id: sessionId, name: teamConfig.name, passcode: teamConfig.passcode})
                ));
            } else if (finalGameData.num_teams > 0) {
                const defaultTeamsPromises = Array.from({length: finalGameData.num_teams}).map((_, i) =>
                    db.teams.create({
                        session_id: sessionId,
                        name: `Team ${String.fromCharCode(65 + i)}`,
                        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
                    })
                );
                await Promise.all(defaultTeamsPromises);
            }
            return updatedSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error finalizing draft session:", error);
            throw new Error(`Failed to finalize game session: ${errorMessage}`);
        }
    }

    async getLatestDraftForTeacher(teacherId: string): Promise<GameSession | null> {
        try {
            const sessions = await db.sessions.getByTeacher(teacherId);
            const draftSessions = sessions.filter(s => (s as any).status === 'draft');
            if (draftSessions.length > 0) {
                return draftSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as GameSession;
            }
            return null;
        } catch (error) {
            console.error(`[GameSessionManager] Error checking for draft sessions:`, error);
            throw new Error(`Failed to check for existing drafts: ${formatSupabaseError(error)}`);
        }
    }

    async getCategorizedSessionsForTeacher(teacherId: string): Promise<{
        draft: GameSession[];
        active: GameSession[];
        completed: GameSession[];
    }> {
        try {
            const allSessions = await db.sessions.getByTeacher(teacherId);
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
        teacherId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Attempting to create new session (legacy method)...");

        // REFACTOR: Use the flat slides array
        const firstSlide = fullGameStructure.slides[0];
        if (!firstSlide) {
            throw new Error("Game structure is missing slides, cannot create session.");
        }

        const sessionToInsert = {
            name: gameCreationData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
            teacher_id: teacherId,
            status: 'active' as const,
            class_name: gameCreationData.class_name?.trim() || null,
            grade_level: gameCreationData.grade_level || null,
            game_version: gameCreationData.game_version,
            // REFACTOR: Set current_slide_index to 0
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
            wizard_state: null,
        };

        try {
            const newSession = await db.sessions.create(sessionToInsert);
            if (!newSession || !newSession.id) {
                throw new Error("Failed to create game session record or retrieve its ID.");
            }
            console.log(`[GameSessionManager] Session created: ${newSession.id}`);

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
            const sessionData = await db.sessions.get(sessionId);
            if (!sessionData) throw new Error(`Session with ID '${sessionId}' not found.`);
            return sessionData as GameSession;
        } catch (error) {
            throw new Error(`Failed to load session: ${formatSupabaseError(error)}`);
        }
    }

    async updateSession(sessionId: string, updates: SessionUpdatePayload): Promise<GameSession> {
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
            await db.sessions.delete(sessionId);
        } catch (error) {
            throw new Error(`Failed to delete session: ${formatSupabaseError(error)}`);
        }
    }

    async getSessionsForTeacher(teacherId: string): Promise<GameSession[]> {
        try {
            const sessions = await db.sessions.getByTeacher(teacherId);
            return sessions as GameSession[];
        } catch (error) {
            throw new Error(`Failed to fetch sessions: ${formatSupabaseError(error)}`);
        }
    }

    async resetSessionProgress(sessionId: string): Promise<GameSession> {
        console.log('[GameSessionManager] Resetting session progress:', sessionId);
        return this.updateSession(sessionId, {
            current_slide_index: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
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

    async updateTeacherNotes(sessionId: string, notes: Record<string, string>): Promise<GameSession> {
        return this.updateSession(sessionId, {teacher_notes: notes});
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
        currentPhase: string | null; // Note: This is now a legacy-ish field. current_slide_index is primary.
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
