// src/pages/TeamDisplayPage/hooks/useDecisionSubmission.ts - Decision submission + validation
import { useCallback } from 'react';
import { useSupabaseMutation } from '../../../hooks/useSupabaseOperation';
import { db } from '../../../utils/supabase';
import { GamePhaseNode } from '../../../types';

interface UseDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
}

interface UseDecisionSubmissionReturn {
    submitDecision: (decisionData: any) => Promise<void>;
    isSubmitting: boolean;
    submissionError: string | null;
    submissionMessage: string | null;
    clearSubmissionMessage: () => void;
}

export const useDecisionSubmission = ({
                                          sessionId,
                                          teamId,
                                          currentPhase
                                      }: UseDecisionSubmissionProps): UseDecisionSubmissionReturn => {
    // Enhanced mutation for decision submission
    const {
        execute: submitDecisionExecute,
        isLoading: isSubmitting,
        error: submissionError
    } = useSupabaseMutation(
        async (decisionData: any) => {
            if (!sessionId || !teamId || !currentPhase) {
                throw new Error('Missing required data for submission');
            }

            const submissionPayload = {
                ...decisionData,
                session_id: sessionId,
                team_id: teamId,
                phase_id: currentPhase.id,
                round_number: currentPhase.round_number as 0 | 1 | 2 | 3,
                submitted_at: new Date().toISOString(),
            };

            return db.decisions.create(submissionPayload);
        },
        {
            onSuccess: () => {
                console.log('[useDecisionSubmission] Decision submitted successfully');
            },
            onError: (error) => {
                console.error('[useDecisionSubmission] Submission failed:', error);
            }
        }
    );

    const submitDecision = useCallback(async (decisionData: any) => {
        console.log('[useDecisionSubmission] === DECISION SUBMIT START ===');
        console.log('[useDecisionSubmission] sessionId:', sessionId);
        console.log('[useDecisionSubmission] teamId:', teamId);
        console.log('[useDecisionSubmission] currentPhase:', currentPhase);
        console.log('[useDecisionSubmission] decisionData:', decisionData);

        if (!sessionId || !teamId || !currentPhase) {
            const missingItems = [];
            if (!sessionId) missingItems.push('sessionId');
            if (!teamId) missingItems.push('teamId');
            if (!currentPhase) missingItems.push('currentPhase');

            console.error('[useDecisionSubmission] Missing required data:', missingItems);
            throw new Error(`Cannot submit: Missing ${missingItems.join(', ')}`);
        }

        await submitDecisionExecute(decisionData);
    }, [sessionId, teamId, currentPhase, submitDecisionExecute]);

    return {
        submitDecision,
        isSubmitting,
        submissionError,
        submissionMessage: submissionError ? `Failed to submit: ${submissionError}` : null,
        clearSubmissionMessage: () => {} // Could be enhanced if needed
    };
};
