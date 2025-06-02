// src/core/game/PhaseManager.ts
import {GameStructure, GamePhaseNode, Slide, GameSession} from '@shared/types';
import {GameSessionManager, SessionUpdatePayload} from './GameSessionManager';

/**
 * Manages the progression through game phases and slides.
 * It encapsulates the logic for moving next/previous and selecting specific phases.
 */
export class PhaseManager {
    private gameStructure: GameStructure;
    private sessionManager: GameSessionManager;
    private allPhasesInOrder: GamePhaseNode[];

    constructor(gameStructure: GameStructure, sessionManager: GameSessionManager) {
        if (!gameStructure) {
            throw new Error("PhaseManager requires a valid GameStructure.");
        }
        if (!sessionManager) {
            throw new Error("PhaseManager requires a valid GameSessionManager instance.");
        }
        this.gameStructure = gameStructure;
        this.sessionManager = sessionManager;
        this.allPhasesInOrder = this.buildAllPhasesInOrder(gameStructure);
    }

    /**
     * Builds a flat array of all game phases in their sequential order.
     * @param structure The GameStructure object.
     * @returns An array of GamePhaseNode in order.
     */
    private buildAllPhasesInOrder(structure: GameStructure): GamePhaseNode[] {
        return [
            ...structure.welcome_phases,
            ...structure.rounds.flatMap(round => round.phases),
            ...structure.game_end_phases
        ];
    }

    /**
     * Retrieves all phases in their defined order.
     */
    getAllPhasesInOrder(): GamePhaseNode[] {
        return this.allPhasesInOrder;
    }

    /**
     * Retrieves a specific phase by its ID.
     * @param phaseId The ID of the phase.
     * @returns The GamePhaseNode or null if not found.
     */
    getPhaseById(phaseId: string): GamePhaseNode | null {
        return this.allPhasesInOrder.find(p => p.id === phaseId) || null;
    }

    /**
     * Retrieves a specific slide by its ID.
     * @param slideId The ID of the slide.
     * @returns The Slide object or null if not found.
     */
    getSlideById(slideId: number): Slide | null {
        return this.gameStructure.slides.find(s => s.id === slideId) || null;
    }

    /**
     * Navigates to the next slide in the game flow.
     * If at the end of a phase, it moves to the next phase.
     * @param currentSessionId The ID of the current game session.
     * @param currentPhaseId The ID of the currently active phase.
     * @param currentSlideIdInPhase The index of the currently active slide within its phase.
     * @returns The updated GameSession object.
     * @throws Error if navigation fails or session ID is invalid.
     */
    async nextSlide(
        currentSessionId: string,
        currentPhaseId: string | null,
        currentSlideIdInPhase: number | null
    ): Promise<GameSession> {
        if (!currentSessionId || currentSessionId === 'new') {
            throw new Error("Invalid session ID for navigation.");
        }
        if (currentPhaseId === null || currentSlideIdInPhase === null) {
            console.warn("[PhaseManager] Current phase or slide index is null, cannot advance. Defaulting to first slide.");
            const firstPhase = this.allPhasesInOrder[0];
            return this.sessionManager.updateSession(currentSessionId, {
                current_phase_id: firstPhase.id,
                current_slide_id_in_phase: 0,
            });
        }

        const currentPhaseNode = this.getPhaseById(currentPhaseId);
        if (!currentPhaseNode) {
            throw new Error(`Current phase with ID '${currentPhaseId}' not found in game structure.`);
        }

        const isLastSlideInPhase = currentSlideIdInPhase >= currentPhaseNode.slide_ids.length - 1;
        let nextPhaseId = currentPhaseId;
        let nextSlideIndexInPhase = currentSlideIdInPhase + 1;
        let isSessionComplete = false;

        if (isLastSlideInPhase) {
            const currentOverallPhaseIndex = this.allPhasesInOrder.findIndex(p => p.id === currentPhaseId);
            if (currentOverallPhaseIndex < this.allPhasesInOrder.length - 1) {
                const nextPhaseNodeCandidate = this.allPhasesInOrder[currentOverallPhaseIndex + 1];
                nextPhaseId = nextPhaseNodeCandidate.id;
                nextSlideIndexInPhase = 0;
            } else {
                // End of the game
                isSessionComplete = true;
            }
        }

        const updates: SessionUpdatePayload = {
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
            is_complete: isSessionComplete
        };

        return this.sessionManager.updateSession(currentSessionId, updates);
    }

    /**
     * Navigates to the previous slide in the game flow.
     * If at the beginning of a phase, it moves to the previous phase.
     * @param currentSessionId The ID of the current game session.
     * @param currentPhaseId The ID of the currently active phase.
     * @param currentSlideIdInPhase The index of the currently active slide within its phase.
     * @returns The updated GameSession object.
     * @throws Error if navigation fails or session ID is invalid.
     */
    async previousSlide(
        currentSessionId: string,
        currentPhaseId: string | null,
        currentSlideIdInPhase: number | null
    ): Promise<GameSession> {
        if (!currentSessionId || currentSessionId === 'new') {
            throw new Error("Invalid session ID for navigation.");
        }
        if (currentPhaseId === null || currentSlideIdInPhase === null) {
            console.warn("[PhaseManager] Current phase or slide index is null, cannot go back.");
            throw new Error("Cannot go back from initial state.");
        }

        let newPhaseId = currentPhaseId;
        let newSlideIndex = currentSlideIdInPhase;

        if (currentSlideIdInPhase > 0) {
            newSlideIndex = currentSlideIdInPhase - 1;
        } else {
            const currentOverallPhaseIndex = this.allPhasesInOrder.findIndex(p => p.id === currentPhaseId);
            if (currentOverallPhaseIndex > 0) {
                const prevPhaseNode = this.allPhasesInOrder[currentOverallPhaseIndex - 1];
                newPhaseId = prevPhaseNode.id;
                newSlideIndex = prevPhaseNode.slide_ids.length - 1; // Go to last slide of previous phase
            } else {
                // Already at the very first slide of the entire game
                throw new Error("Already at the beginning of the game.");
            }
        }

        const updates: SessionUpdatePayload = {
            current_phase_id: newPhaseId,
            current_slide_id_in_phase: newSlideIndex,
            is_complete: false // Assuming going back means not complete
        };

        return this.sessionManager.updateSession(currentSessionId, updates);
    }

    /**
     * Navigates directly to a specific phase, setting the slide index to 0.
     * @param currentSessionId The ID of the current game session.
     * @param phaseId The ID of the target phase.
     * @returns The updated GameSession object.
     * @throws Error if the session ID is invalid or the phase is not found.
     */
    async selectPhase(currentSessionId: string, phaseId: string): Promise<GameSession> {
        if (!currentSessionId || currentSessionId === 'new') {
            throw new Error("Invalid session ID for navigation.");
        }

        const targetPhase = this.getPhaseById(phaseId);
        if (!targetPhase) {
            throw new Error(`Phase with ID '${phaseId}' not found.`);
        }

        const updates: SessionUpdatePayload = {
            current_phase_id: phaseId,
            current_slide_id_in_phase: 0,
            is_complete: false // Assume jumping to a phase means not complete
        };

        return this.sessionManager.updateSession(currentSessionId, updates);
    }
}
