// src/components/TeacherHost/TeamSubmissionTable.tsx
import React, {useState} from 'react';
import {useAppContext} from '../../context/AppContext';
import {TeamDecision} from '../../types';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Edit3, Info} from 'lucide-react';
// We will call a function from AppContext to handle the reset,
// as AppContext needs to manage the Supabase call and subsequent state updates (like re-fetching or clearing local state)

interface TeamSubmissionTableProps {
    // No props needed directly, it will consume from AppContext
}

const TeamSubmissionTable: React.FC<TeamSubmissionTableProps> = () => {
    const {state, currentPhase, resetTeamDecisionForPhase} = useAppContext();
    const {teams, teamDecisions, currentSessionId, currentPhaseId, gameStructure} = state;

    const [isLoadingReset, setIsLoadingReset] = useState<Record<string, boolean>>({}); // teamId: isLoading

    const getTeamDecisionForCurrentPhase = (teamId: string): TeamDecision | undefined => {
        const decisionsByPhase = teamDecisions[teamId] || {};
        return decisionsByPhase[currentPhaseId || ''];
    };

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentPhase || !gameStructure) return 'Pending...';

        if (currentPhase.phase_type === 'invest' && decision.selected_investment_ids && decision.selected_investment_ids.length > 0) {
            const investmentPhaseKey = currentPhase.id;
            const investmentOptionsForPhase = gameStructure.all_investment_options[investmentPhaseKey] || [];
            const selectedNames = decision.selected_investment_ids.map(id => {
                const option = investmentOptionsForPhase.find(opt => opt.id === id);
                return option ? option.name.replace(/^\d+\.\s*/, '') : id; // Remove leading "1. "
            }).join(', ');
            return selectedNames || 'None Selected';
        }

        if (currentPhase.phase_type === 'choice' && decision.selected_challenge_option_id) {
            const choicePhaseKey = currentPhase.id;
            const challengeOptionsForPhase = gameStructure.all_challenge_options[choicePhaseKey] || [];
            const option = challengeOptionsForPhase.find(opt => opt.id === decision.selected_challenge_option_id);
            return option ? `Chose: ${option.id}` : `Option ID: ${decision.selected_challenge_option_id}`;
        }

        if ((currentPhase.phase_type === 'double-down-prompt' || currentPhase.phase_type === 'double-down-select') && decision.double_down_decision) {
            const dd = decision.double_down_decision;
            if (currentPhase.phase_type === 'double-down-prompt') {
                return decision.selected_challenge_option_id === 'yes_dd' ? 'Opted to Double Down' : 'Skipped Double Down';
            }
            if (dd.investmentToDoubleDownId && dd.investmentToSacrificeId) {
                const sacrificeOpt = gameStructure.all_investment_options[`rd${currentPhase.round_number}-invest`]?.find(o => o.id === dd.investmentToSacrificeId);
                const doubleDownOpt = gameStructure.all_investment_options[`rd${currentPhase.round_number}-invest`]?.find(o => o.id === dd.investmentToDoubleDownId);
                return `Sacrifice: ${sacrificeOpt?.name.replace(/^\d+\.\s*/, '') || 'N/A'}, Double: ${doubleDownOpt?.name.replace(/^\d+\.\s*/, '') || 'N/A'}`;
            }
            return 'Awaiting DD selection';
        }

        if (decision.submitted_at) return 'Submitted'; // Fallback if no specific data found but submitted
        return 'Pending...';
    };

    const handleResetClick = async (teamId: string) => {
        if (!currentSessionId || !currentPhaseId) return;
        const team = teams.find(t => t.id === teamId);
        const confirmReset = window.confirm(`Are you sure you want to reset ${team?.name || 'this team'}'s decision for "${currentPhase?.label}"? They will be able to submit again.`);
        if (!confirmReset) return;

        setIsLoadingReset(prev => ({...prev, [teamId]: true}));
        try {
            await resetTeamDecisionForPhase(teamId, currentPhaseId);
            // AppContext's real-time subscription or explicit state update in resetTeamDecisionForPhase should refresh this table.
            alert(`${team?.name || 'Team'}'s decision for this phase has been reset.`);
        } catch (err) {
            console.error("Error resetting team decision from table:", err);
            alert(`Failed to reset decision. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoadingReset(prev => ({...prev, [teamId]: false}));
        }
    };

    if (!currentPhase?.is_interactive_student_phase) {
        return (
            <div className="bg-gray-50 p-3 my-4 rounded-lg shadow-inner text-center text-gray-500 text-sm">
                <Info size={18} className="inline mr-1.5 text-blue-500"/>
                Team submissions are not active for the current game phase.
            </div>
        );
    }

    if (teams.length === 0 && !state.isLoading) { // Check isLoading to avoid premature display
        return <div className="text-center p-4 text-gray-500">No teams have joined the session yet or team data is
            loading.</div>;
    }


    return (
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3">
                Team Submissions: <span
                className="text-blue-600">{currentPhase?.label || 'Current Interactive Phase'}</span>
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100">
                    <tr>
                        <th scope="col"
                            className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                        </th>
                        <th scope="col"
                            className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th scope="col"
                            className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Selection/Details
                        </th>
                        <th scope="col"
                            className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reset
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {state.isLoading && teams.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-4 text-gray-500">Loading team data...</td>
                        </tr>
                    )}
                    {!state.isLoading && teams.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-4 text-gray-500">No teams in this session yet.
                            </td>
                        </tr>
                    )}
                    {teams.map((team) => {
                        const decision = getTeamDecisionForCurrentPhase(team.id);
                        const hasSubmitted = !!decision?.submitted_at;

                        return (
                            <tr key={team.id}
                                className={hasSubmitted ? 'bg-green-50/70 hover:bg-green-100/70' : 'bg-yellow-50/70 hover:bg-yellow-100/70'}>
                                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">{team.name}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    {hasSubmitted ? (
                                        <span className="flex items-center text-green-700 font-medium">
                        <CheckCircle2 size={16} className="mr-1.5 flex-shrink-0"/> Submitted
                      </span>
                                    ) : (
                                        <span className="flex items-center text-amber-700 font-medium">
                        <Hourglass size={16} className="mr-1.5 flex-shrink-0 animate-pulse"/> Pending
                      </span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-gray-600 max-w-md break-words">
                                    {formatSelection(decision)}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                    {hasSubmitted && (
                                        <button
                                            onClick={() => handleResetClick(team.id)}
                                            disabled={isLoadingReset[team.id]}
                                            className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1.5 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 transition-colors"
                                            title="Reset this team's submission"
                                        >
                                            {isLoadingReset[team.id] ? <RotateCcw size={18} className="animate-spin"/> :
                                                <XCircle size={18}/>}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeamSubmissionTable;