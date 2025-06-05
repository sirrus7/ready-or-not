// src/core/game/GameSessionManager.ts - Enhanced with draft session support
import {GameStructure, GameSession, NewGameData} from '@shared/types';
import {db, formatSupabaseError} from '@shared/services/supabase';

// Define specific payloads for clarity and type safety
export interface SessionUpdatePayload {
    current_phase_id?: string | null;
    current_slide_id_in_phase?: number | null;
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

/**
 * GameSessionManager is a singleton class that centralizes all session-related
 * data access and core business logic, including associated entities like teams.
 * Enhanced with draft session support for early game creation.
 */
export class GameSessionManager {
    private static instance: GameSessionManager;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    /**
     * Returns the singleton instance of GameSessionManager.
     */
    static getInstance(): GameSessionManager {
        if (!GameSessionManager.instance) {
            GameSessionManager.instance = new GameSessionManager();
        }
        return GameSessionManager.instance;
    }

    /**
     * Creates a new draft game session for immediate session ID availability.
     * This allows QR codes and join links to be generated early in the wizard.
     * @param teacherId The ID of the teacher creating the session.
     * @param fullGameStructure The full game structure definition used to initialize the first phase.
     * @returns The newly created draft GameSession object.
     * @throws Error if draft session creation fails.
     */
    async createDraftSession(
        teacherId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Creating new draft session...");

        const initialPhase = fullGameStructure.welcome_phases[0];
        if (!initialPhase) {
            throw new Error("Game structure is missing welcome phases, cannot create draft session.");
        }

        const draftSessionToInsert = {
            name: `Draft Game - ${new Date().toLocaleDateString()}`,
            teacher_id: teacherId,
            status: 'draft' as const,
            game_version: '2.0_dd' as const, // Default, can be changed in wizard
            current_phase_id: initialPhase.id,
            current_slide_id_in_phase: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
            wizard_state: {}, // Empty initial wizard state
            // Optional fields start as null for draft
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

    /**
     * Updates the wizard state for a draft session.
     * This allows persistence of wizard progress as the user moves through steps.
     * @param sessionId The ID of the draft session to update.
     * @param wizardState The wizard state data to persist.
     * @throws Error if the update fails.
     */
    async updateWizardState(sessionId: string, wizardState: Partial<NewGameData>): Promise<void> {
        console.log(`[GameSessionManager] Updating wizard state for session ${sessionId}`);
        try {
            await this.updateSession(sessionId, {wizard_state: wizardState});
        } catch (error) {
            console.error(`[GameSessionManager] Error updating wizard state:`, error);
            throw new Error(`Failed to save wizard progress: ${formatSupabaseError(error)}`);
        }
    }

    /**
     * Finalizes a draft session by transitioning it to 'active' status and creating teams.
     * This is called when the wizard is completed.
     * @param sessionId The ID of the draft session to finalize.
     * @param finalGameData The final game configuration data from the wizard.
     * @returns The finalized GameSession object.
     * @throws Error if finalization fails.
     */
    async finalizeDraftSession(
        sessionId: string,
        finalGameData: NewGameData
    ): Promise<GameSession> {
        console.log(`[GameSessionManager] Finalizing draft session: ${sessionId}`);

        try {
            // Update session to active status with final data
            const updatedSession = await this.updateSession(sessionId, {
                status: 'active',
                name: finalGameData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
                class_name: finalGameData.class_name?.trim() || null,
                grade_level: finalGameData.grade_level || null,
                game_version: finalGameData.game_version,
                wizard_state: null, // Clear wizard state as it's no longer needed
            });

            // Create teams based on final configuration
            const teamsToCreate = finalGameData.teams_config && Array.isArray(finalGameData.teams_config)
                ? finalGameData.teams_config
                : [];

            if (teamsToCreate.length > 0) {
                console.log(`[GameSessionManager] Creating ${teamsToCreate.length} teams for finalized session...`);
                await Promise.all(teamsToCreate.map(teamConfig =>
                    db.teams.create({
                        session_id: sessionId,
                        name: teamConfig.name,
                        passcode: teamConfig.passcode,
                    })
                ));
                console.log(`[GameSessionManager] ${teamsToCreate.length} teams created successfully.`);
            } else if (finalGameData.num_teams > 0) {
                // Fallback to creating default teams
                console.log(`[GameSessionManager] Creating ${finalGameData.num_teams} default teams.`);
                const defaultTeamsPromises = Array.from({length: finalGameData.num_teams}).map((_, i) =>
                    db.teams.create({
                        session_id: sessionId,
                        name: `Team ${String.fromCharCode(65 + i)}`,
                        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
                    })
                );
                await Promise.all(defaultTeamsPromises);
                console.log(`[GameSessionManager] ${finalGameData.num_teams} default teams created successfully.`);
            }

            return updatedSession;

        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error finalizing draft session:", error);
            throw new Error(`Failed to finalize game session: ${errorMessage}`);
        }
    }

    /**
     * Gets the latest draft session for a teacher, if any exists.
     * Used for resuming wizard progress.
     * @param teacherId The ID of the teacher.
     * @returns The latest draft session or null if none exists.
     */
    async getLatestDraftForTeacher(teacherId: string): Promise<GameSession | null> {
        console.log(`[GameSessionManager] Checking for existing draft sessions for teacher: ${teacherId}`);
        try {
            const sessions = await db.sessions.getByTeacher(teacherId);
            const draftSessions = sessions.filter(s => (s as any).status === 'draft');

            if (draftSessions.length > 0) {
                // Return the most recently created draft
                const latestDraft = draftSessions.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];
                console.log(`[GameSessionManager] Found existing draft session: ${latestDraft.id}`);
                return latestDraft as GameSession;
            }

            console.log(`[GameSessionManager] No draft sessions found for teacher`);
            return null;

        } catch (error) {
            console.error(`[GameSessionManager] Error checking for draft sessions:`, error);
            throw new Error(`Failed to check for existing drafts: ${formatSupabaseError(error)}`);
        }
    }

    /**
     * Gets all sessions for a teacher, categorized by status.
     * @param teacherId The ID of the teacher.
     * @returns Object containing arrays of sessions by status.
     */
    async getCategorizedSessionsForTeacher(teacherId: string): Promise<{
        draft: GameSession[];
        active: GameSession[];
        completed: GameSession[];
    }> {
        console.log(`[GameSessionManager] Fetching categorized sessions for teacher: ${teacherId}`);
        try {
            const allSessions = await db.sessions.getByTeacher(teacherId);

            const categorized = {
                draft: allSessions.filter(s => (s as any).status === 'draft'),
                active: allSessions.filter(s => (s as any).status === 'active' && !s.is_complete),
                completed: allSessions.filter(s => (s as any).status === 'completed' || s.is_complete),
            };

            console.log(`[GameSessionManager] Found ${categorized.draft.length} draft, ${categorized.active.length} active, ${categorized.completed.length} completed sessions`);
            return categorized as any;

        } catch (error) {
            console.error(`[GameSessionManager] Error fetching categorized sessions:`, error);
            throw new Error(`Failed to fetch sessions: ${formatSupabaseError(error)}`);
        }
    }

    // ... (keep all existing methods from original file)

    /**
     * Creates a new game session and associated teams in the database.
     * This is the original method, kept for backwards compatibility.
     * New implementations should use createDraftSession + finalizeDraftSession.
     */
    async createSession(
        gameCreationData: NewGameData,
        teacherId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Attempting to create new session (legacy method)...");

        const initialPhase = fullGameStructure.welcome_phases[0];
        if (!initialPhase) {
            throw new Error("Game structure is missing welcome phases, cannot create session.");
        }

        const sessionToInsert = {
            name: gameCreationData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
            teacher_id: teacherId,
            status: 'active' as const, // Legacy method creates active sessions directly
            class_name: gameCreationData.class_name?.trim() || null,
            grade_level: gameCreationData.grade_level || null,
            game_version: gameCreationData.game_version,
            current_phase_id: initialPhase.id,
            current_slide_id_in_phase: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
            wizard_state: null, // No wizard state for direct creation
        };

        try {
            const newSession = await db.sessions.create(sessionToInsert);

            if (!newSession || !newSession.id) {
                throw new Error("Failed to create game session record or retrieve its ID.");
            }

            console.log(`[GameSessionManager] Session created: ${newSession.id}`);

            // Create teams if configured
            const teamsToCreate = gameCreationData.teams_config && Array.isArray(gameCreationData.teams_config)
                ? gameCreationData.teams_config
                : [];

            if (teamsToCreate.length > 0) {
                console.log(`[GameSessionManager] Creating ${teamsToCreate.length} teams...`);
                await Promise.all(teamsToCreate.map(teamConfig =>
                    db.teams.create({
                        session_id: newSession.id,
                        name: teamConfig.name,
                        passcode: teamConfig.passcode,
                    })
                ));
                console.log(`[GameSessionManager] ${teamsToCreate.length} teams created successfully.`);
            } else if (gameCreationData.num_teams > 0) {
                console.log(`[GameSessionManager] Creating ${gameCreationData.num_teams} default teams.`);
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

    /**
     * Loads an existing game session from the database.
     * @param sessionId The ID of the session to load.
     * @returns The loaded GameSession object.
     * @throws Error if the session cannot be found or loaded.
     */
    async loadSession(sessionId: string): Promise<GameSession> {
        console.log(`[GameSessionManager] Loading session: ${sessionId}`);
        try {
            const sessionData = await db.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error(`Session with ID '${sessionId}' not found.`);
            }
            console.log(`[GameSessionManager] Session loaded: ${sessionData.id}`);
            return sessionData as GameSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error(`[GameSessionManager] Error loading session ${sessionId}:`, error);
            throw new Error(`Failed to load session: ${errorMessage}`);
        }
    }

    /**
     * Updates an existing game session in the database.
     * @param sessionId The ID of the session to update.
     * @param updates An object containing the fields to update.
     * @returns The updated GameSession object.
     * @throws Error if the update fails.
     */
    async updateSession(sessionId: string, updates: SessionUpdatePayload): Promise<GameSession> {
        if (!sessionId || sessionId === 'new') {
            throw new Error('Cannot update session: Invalid session ID');
        }
        console.log(`[GameSessionManager] Updating session ${sessionId} with updates:`, updates);
        try {
            const updatedSession = await db.sessions.update(sessionId, updates);
            if (!updatedSession) {
                throw new Error(`Failed to update session with ID '${sessionId}'.`);
            }
            console.log(`[GameSessionManager] Session updated: ${updatedSession.id}`);
            return updatedSession as GameSession;
        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error(`[GameSessionManager] Error updating session ${sessionId}:`, error);
            throw new Error(`Failed to save session progress: ${errorMessage}`);
        }
    }

    /**
     * Deletes a session and all related data (teams, decisions, KPIs, adjustments).
     * @param sessionId The ID of the session to delete.
     * @throws Error if the deletion fails.
     */
    async deleteSession(sessionId: string): Promise<void> {
        console.log('[GameSessionManager] Deleting session and related data:', sessionId);
        try {
            await db.sessions.delete(sessionId);
            console.log('[GameSessionManager] Session deleted successfully:', sessionId);
        } catch (error) {
            console.error('[GameSessionManager] Failed to delete session:', sessionId, error);
            throw new Error(`Failed to delete session: ${formatSupabaseError(error)}`);
        }
    }

    /**
     * Fetches all game sessions for a given teacher.
     * @param teacherId The ID of the teacher.
     * @returns An array of GameSession objects.
     * @throws Error if the fetch operation fails.
     */
    async getSessionsForTeacher(teacherId: string): Promise<GameSession[]> {
        console.log('[GameSessionManager] Fetching sessions for teacher:', teacherId);
        try {
            const sessions = await db.sessions.getByTeacher(teacherId);
            return sessions as GameSession[];
        } catch (error) {
            console.error('[GameSessionManager] Failed to fetch teacher sessions:', teacherId, error);
            throw new Error(`Failed to fetch sessions: ${formatSupabaseError(error)}`);
        }
    }

    /**
     * Resets session progress to initial state, clearing related data.
     * @param sessionId The ID of the session to reset.
     * @param fullGameStructure The full game structure to get the initial phase.
     * @returns The updated GameSession object.
     */
    async resetSessionProgress(
        sessionId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log('[GameSessionManager] Resetting session progress:', sessionId);

        const initialPhase = fullGameStructure.allPhases[0];
        const resetUpdates: SessionUpdatePayload = {
            current_phase_id: initialPhase?.id || null,
            current_slide_id_in_phase: initialPhase ? 0 : null,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
            status: 'active', // Reset to active status
            wizard_state: null, // Clear any wizard state
        };

        return this.updateSession(sessionId, resetUpdates);
    }

    /**
     * Marks a session as complete.
     * @param sessionId The ID of the session to mark as complete.
     * @returns The updated GameSession object.
     */
    async completeSession(sessionId: string): Promise<GameSession> {
        console.log('[GameSessionManager] Marking session as complete:', sessionId);
        return this.updateSession(sessionId, {
            is_complete: true,
            is_playing: false,
            status: 'completed'
        });
    }

    /**
     * Navigates a session to a specific phase and slide index.
     * @param sessionId The ID of the session.
     * @param phaseId The ID of the target phase.
     * @param slideIndex The index of the target slide within the phase.
     * @returns The updated GameSession object.
     */
    async navigateToPhaseSlide(
        sessionId: string,
        phaseId: string,
        slideIndex: number
    ): Promise<GameSession> {
        console.log('[GameSessionManager] Navigating to phase/slide:', sessionId, phaseId, slideIndex);
        return this.updateSession(sessionId, {
            current_phase_id: phaseId,
            current_slide_id_in_phase: slideIndex
        });
    }

    /**
     * Updates teacher notes for a specific session.
     * @param sessionId The ID of the session.
     * @param notes The updated teacher notes object.
     * @returns The updated GameSession object.
     */
    async updateTeacherNotes(
        sessionId: string,
        notes: Record<string, string>
    ): Promise<GameSession> {
        console.log('[GameSessionManager] Updating teacher notes:', sessionId);
        return this.updateSession(sessionId, {
            teacher_notes: notes
        });
    }

    /**
     * Validates if a session exists in the database.
     * @param sessionId The ID of the session to validate.
     * @returns True if the session exists, false otherwise.
     */
    async validateSession(sessionId: string): Promise<boolean> {
        try {
            await this.loadSession(sessionId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Gets status information for a specific session.
     * @param sessionId The ID of the session.
     * @returns Object with session existence, completion status, current phase, and last updated timestamp.
     */
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
                currentPhase: session.current_phase_id,
                lastUpdated: session.updated_at
            };
        } catch {
            return {
                exists: false,
                status: null,
                isComplete: false,
                currentPhase: null,
                lastUpdated: ''
            };
        }
    }
}
