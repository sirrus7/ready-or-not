// src/core/game/GameSessionManager.ts
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
}

/**
 * GameSessionManager is a singleton class that centralizes all session-related
 * data access and core business logic, including associated entities like teams.
 * It does NOT handle its own caching; that is left to consuming hooks like useSupabaseQuery.
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
     * Creates a new game session and associated teams in the database.
     * This is typically called during the 'Create Game' wizard.
     * @param gameCreationData The data from the New Game wizard form.
     * @param teacherId The ID of the teacher creating the session.
     * @param fullGameStructure The full game structure definition used to initialize the first phase.
     * @returns The newly created GameSession object.
     * @throws Error if session creation or team creation fails.
     */
    async createSession(
        gameCreationData: NewGameData,
        teacherId: string,
        fullGameStructure: GameStructure
    ): Promise<GameSession> {
        console.log("[GameSessionManager] Attempting to create new session...");

        const initialPhase = fullGameStructure.welcome_phases[0];
        if (!initialPhase) {
            throw new Error("Game structure is missing welcome phases, cannot create session.");
        }

        const sessionToInsert = {
            name: gameCreationData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
            teacher_id: teacherId,
            class_name: gameCreationData.class_name?.trim() || null,
            grade_level: gameCreationData.grade_level || null,
            game_version: gameCreationData.game_version,
            current_phase_id: initialPhase.id,
            current_slide_id_in_phase: 0,
            is_playing: false,
            is_complete: false,
            teacher_notes: {},
        };

        try {
            const newSession = await db.sessions.create(sessionToInsert);

            if (!newSession || !newSession.id) {
                throw new Error("Failed to create game session record or retrieve its ID.");
            }

            console.log(`[GameSessionManager] Session created: ${newSession.id}`);

            // Create teams if configured via gameCreationData.teams_config
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
                // Fallback to creating default teams based on num_teams if no specific config
                console.log(`[GameSessionManager] Fallback - Creating ${gameCreationData.num_teams} default teams.`);
                const defaultTeamsPromises = Array.from({length: gameCreationData.num_teams}).map((_, i) =>
                    db.teams.create({
                        session_id: newSession.id,
                        name: `Team ${String.fromCharCode(65 + i)}`, // e.g., Team A, Team B
                        passcode: Math.floor(1000 + Math.random() * 9000).toString(), // 4-digit passcode
                    })
                );
                await Promise.all(defaultTeamsPromises);
                console.log(`[GameSessionManager] ${gameCreationData.num_teams} default teams created successfully.`);
            }

            return newSession as GameSession;

        } catch (error) {
            const errorMessage = formatSupabaseError(error);
            console.error("[GameSessionManager] Error creating session and/or teams:", error);
            // If session was created but team creation failed, consider rolling back or marking session as invalid.
            // For now, re-throw the error.
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
            // db.sessions.delete already handles cascading deletes for related tables
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
     * This is a complex operation that might affect multiple tables.
     * For now, it only resets session state fields. Further logic to reset KPIs/Decisions needs to be added later.
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
            teacher_notes: {}
        };

        // TODO: In a later phase, add logic here to delete/reset team_decisions, team_round_data, and permanent_kpi_adjustments for this session ID.
        // This will likely involve dedicated methods in kpiService, decisionService etc., similar to db.sessions.delete cascade.

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
            is_playing: false
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
            await this.loadSession(sessionId); // Use loadSession to leverage existing error handling
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
        isComplete: boolean;
        currentPhase: string | null;
        lastUpdated: string;
    }> {
        try {
            const session = await this.loadSession(sessionId);
            return {
                exists: true,
                isComplete: session.is_complete,
                currentPhase: session.current_phase_id,
                lastUpdated: session.updated_at
            };
        } catch {
            return {
                exists: false,
                isComplete: false,
                currentPhase: null,
                lastUpdated: ''
            };
        }
    }
}
