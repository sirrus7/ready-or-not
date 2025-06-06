// src/views/host/components/TeamMonitor.tsx - REFACTOR: Removed redundant real-time logic and unused variables.
import React, {useState, useMemo, useEffect} from 'react';
import {useGameContext} from '@app/providers/GameProvider.tsx';
import {TeamDecision} from '@shared/types';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Info, Clock} from 'lucide-react';
import {useSupabaseConnection} from '@shared/services/supabase';
import {useSupabaseMutation} from '@shared/hooks/supabase';
import Modal from '@shared/components/UI/Modal';

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

const TeamMonitor: React.FC = () => {
    const {
        state,
        currentSlideData,
        resetTeamDecision,
        setAllTeamsSubmittedCurrentInteractivePhase
    } = useGameContext();
    const {teams, teamDecisions, gameStructure} = state;
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const [teamToReset, setTeamToReset] = useState<{ id: string, name: string } | null>(null);
    const connection = useSupabaseConnection();
    const decisionKey = currentSlideData?.interactive_data_key;
    const submissionStats = useMemo(() => {
        if (!decisionKey || teams.length === 0) {
            return {submitted: 0, total: teams.length, allSubmitted: false, submittedTeams: []};
        }
        const submittedTeams = teams.filter(team => teamDecisions[team.id]?.[decisionKey]?.submitted_at);
        const allSubmitted = submittedTeams.length === teams.length && teams.length > 0;
        return {
            submitted: submittedTeams.length,
            total: teams.length,
            allSubmitted,
            submittedTeams: submittedTeams.map(t => t.name)
        };
    }, [teams, teamDecisions, decisionKey]);

    useEffect(() => {
        setAllTeamsSubmittedCurrentInteractivePhase(submissionStats.allSubmitted);
    }, [submissionStats.allSubmitted, setAllTeamsSubmittedCurrentInteractivePhase]);

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentSlideData || !gameStructure || !decisionKey) return 'Pending...';

        switch (currentSlideData.type) {
            case 'interactive_invest':
                const selectedIds = decision.selected_investment_ids || [];
                if (selectedIds.length === 0) return `No investments selected`;
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];
                const selectedNames = selectedIds.map(id => investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || 'Unknown').join(', ');
                return `${selectedNames} (${formatCurrency(decision.total_spent_budget || 0)} spent)`;
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
                const optionId = decision.selected_challenge_option_id;
                if (!optionId) return 'No choice made';
                const options = gameStructure.all_challenge_options[decisionKey] || [];
                const option = options.find(opt => opt.id === optionId);
                return option ? `${option.id}: "${option.text.substring(0, 40)}..."` : `Option ${optionId}`;
            default:
                return decision.submitted_at ? 'Submitted' : 'Pending...';
        }
    };

    const {execute: executeReset, isLoading: isResetting, error: resetError} = useSupabaseMutation(
        async (data: { teamId: string, decisionKey: string }) => {
            // REFACTOR: This now just calls the function from the context.
            // The context handles the DB call and the data refetch.
            await resetTeamDecision(data.teamId, data.decisionKey);
        }
    );

    const handleResetClick = (teamId: string, teamName: string) => {
        setTeamToReset({id: teamId, name: teamName});
        setIsResetModalOpen(true);
    };

    const confirmReset = async () => {
        if (!teamToReset || !decisionKey) return;
        await executeReset({teamId: teamToReset.id, decisionKey});
        setIsResetModalOpen(false);
        setTeamToReset(null);
    };

    if (!currentSlideData || !decisionKey) {
        return (
            <div className="bg-gray-50 p-3 my-4 rounded-lg shadow-inner text-center text-gray-500 text-sm">
                <Info size={18} className="inline mr-1.5 text-blue-500"/>
                Submissions are not active for this slide.
            </div>
        );
    }

    return (
        <>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                            Team Submissions: <span className="text-blue-600">{currentSlideData.title}</span>
                        </h3>
                        {/* REFACTOR: Removed lastUpdateTime and redundant phase info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            {!connection.isConnected &&
                                <span className="text-red-600 font-semibold">⚠ Disconnected</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${submissionStats.allSubmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {submissionStats.allSubmitted ? <CheckCircle2 size={16}/> : <Clock size={16}/>}
                            {submissionStats.submitted}/{submissionStats.total}
                        </div>
                    </div>
                </div>
                {resetError && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-md text-sm">Reset
                    failed: {resetError}</div>}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Selection</th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {teams.map((team) => {
                            const decision = teamDecisions[team.id]?.[decisionKey];
                            const hasSubmitted = !!decision?.submitted_at;
                            return (
                                <tr key={team.id} className={hasSubmitted ? 'bg-green-50/70' : 'bg-yellow-50/70'}>
                                    <td className="px-3 py-2.5 font-medium text-gray-800">{team.name}</td>
                                    <td className="px-3 py-2.5">
                                        {hasSubmitted ?
                                            <span className="flex items-center text-green-700"><CheckCircle2 size={16}
                                                                                                             className="mr-1.5"/>Submitted</span> :
                                            <span className="flex items-center text-amber-700"><Hourglass size={16}
                                                                                                          className="mr-1.5"/>Working...</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 max-w-md break-words">{formatSelection(decision)}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        {hasSubmitted && <button onClick={() => handleResetClick(team.id, team.name)}
                                                                 disabled={isResetting}
                                                                 className="text-red-600 hover:text-red-800 p-1.5 rounded-full hover:bg-red-100">
                                            <XCircle size={18}/></button>}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Team Submission"
                   size="sm">
                <div className="p-1">
                    <p>Are you sure you want to reset the submission for <strong>{teamToReset?.name}</strong>? This will
                        allow them to submit again.</p>
                    <div className="mt-5 flex flex-row-reverse gap-3">
                        <button onClick={confirmReset} disabled={isResetting}
                                className="bg-red-600 text-white inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto">
                            {isResetting ? <><RotateCcw
                                className="animate-spin h-5 w-5 mr-2"/> Resetting...</> : 'Yes, Reset'}
                        </button>
                        <button onClick={() => setIsResetModalOpen(false)} disabled={isResetting}
                                className="bg-white text-gray-700 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 text-base font-medium hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto">Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TeamMonitor;
