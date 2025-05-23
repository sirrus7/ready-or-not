// src/components/TeacherHost/TeamSubmissionTable.tsx
import React, {useState} from 'react';
import {useAppContext} from '../../context/AppContext';
import {TeamDecision} from '../../types';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Info, RefreshCw} from 'lucide-react';

interface TeamSubmissionTableProps {
    // No props needed directly, it will consume from AppContext
}

const TeamSubmissionTable: React.FC<TeamSubmissionTableProps> = () => {
    const {state, currentPhaseNode, resetTeamDecisionForPhase } = useAppContext();
    const {teams, teamDecisions, currentSessionId, gameStructure} = state;

    const currentPhaseIdFromNode = currentPhaseNode?.id;

    const [isLoadingReset, setIsLoadingReset] = useState<Record<string, boolean>>({});

    const getTeamDecisionForCurrentPhase = (teamId: string): TeamDecision | undefined => {
        if (!currentPhaseIdFromNode) return undefined;
        const decisionsByTeam = teamDecisions[teamId] || {};
        return decisionsByTeam[currentPhaseIdFromNode];
    };

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentPhaseNode || !gameStructure) return 'Pending...';

        const dataKeyForOptions = currentPhaseNode.interactive_data_key || currentPhaseNode.id;

        if (currentPhaseNode.phase_type === 'invest' && decision.selected_investment_ids) {
            const investmentOptionsForPhase = gameStructure.all_investment_options[dataKeyForOptions] || [];
            if (decision.selected_investment_ids.length === 0) return "No Investments Made";

            const selectedNames = decision.selected_investment_ids.map(id => {
                const option = investmentOptionsForPhase.find(opt => opt.id === id);
                // Show first part of name, or fallback to last few chars of ID
                return option ? option.name.split('.')[0] || option.name.substring(0,15) : `ID: ${id.substring(id.length - 4)}`;
            }).join(', ');
            const totalSpent = decision.total_spent_budget !== undefined ? ` ($${(decision.total_spent_budget / 1000).toFixed(0)}k)` : '';
            return (selectedNames || 'Processing...') + totalSpent;
        }

        if (currentPhaseNode.phase_type === 'choice' && decision.selected_challenge_option_id) {
            const challengeOptionsForPhase = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const option = challengeOptionsForPhase.find(opt => opt.id === decision.selected_challenge_option_id);
            let optionLabel = `Option ${decision.selected_challenge_option_id}`;
            if (option) {
                optionLabel = option.text.length > 30 ? `${option.id}: "${option.text.substring(0, 27)}..."` : `${option.id}: "${option.text}"`;
            }
            return optionLabel;
        }

        if (currentPhaseNode.phase_type === 'double-down-prompt' && decision.selected_challenge_option_id) {
            const options = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const chosenOption = options.find(opt => opt.id === decision.selected_challenge_option_id);
            return chosenOption ? chosenOption.text : `Opted: ${decision.selected_challenge_option_id}`;
        }

        if (currentPhaseNode.phase_type === 'double-down-select' && decision.double_down_decision) {
            const dd = decision.double_down_decision;
            const rd3InvestKey = `rd3-invest`;
            const rd3InvestmentOptions = gameStructure.all_investment_options[rd3InvestKey] || [];

            if (!dd.investmentToSacrificeId && !dd.investmentToDoubleDownId) {
                const ddPromptPhaseKey = gameStructure.allPhases.find(p => p.phase_type === 'double-down-prompt' && p.round_number === currentPhaseNode.round_number)?.id;
                if (ddPromptPhaseKey && teamDecisions[decision.team_id]?.[ddPromptPhaseKey]?.selected_challenge_option_id === 'no_dd') {
                    return "Opted Out of Double Down";
                }
                return "No DD Selection Made";
            }

            let details = [];
            if(dd.investmentToSacrificeId) {
                const sacrificeOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToSacrificeId);
                details.push(`Sacrifice: ${sacrificeOpt ? sacrificeOpt.name.replace(/^\d+\.\s*/, '') : `ID ${dd.investmentToSacrificeId.substring(dd.investmentToSacrificeId.length - 4)}`}`);
            } else {
                details.push("Sacrifice: None Selected");
            }

            if(dd.investmentToDoubleDownId) {
                const doubleDownOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToDoubleDownId);
                details.push(`Double On: ${doubleDownOpt ? doubleDownOpt.name.replace(/^\d+\.\s*/, '') : `ID ${dd.investmentToDoubleDownId.substring(dd.investmentToDoubleDownId.length - 4)}`}`);
            } else {
                details.push("Double On: None Selected");
            }
            return details.join('; ');
        }

        if (decision.submitted_at) return 'Submitted (View Details)';
        return 'Pending...';
    };

    const handleResetClick = async (teamId: string) => {
        if (!currentSessionId || !currentPhaseIdFromNode) {
            alert("Cannot reset: Session or Phase ID is missing.");
            return;
        }
        const team = teams.find(t => t.id === teamId);
        const confirmReset = window.confirm(`Are you sure you want to reset ${team?.name || 'this team'}'s decision for "${currentPhaseNode?.label}"? They will be able to submit again.`);
        if (!confirmReset) return;

        setIsLoadingReset(prev => ({...prev, [teamId]: true}));
        try {
            await resetTeamDecisionForPhase(teamId, currentPhaseIdFromNode);
        } catch (err) {
            console.error("Error resetting team decision from table:", err);
            alert(`Failed to reset decision. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoadingReset(prev => ({...prev, [teamId]: false}));
        }
    };

    if (!currentPhaseNode?.is_interactive_student_phase) {
        return (
            <div className="bg-gray-50 p-3 my-4 rounded-lg shadow-inner text-center text-gray-500 text-sm">
                <Info size={18} className="inline mr-1.5 text-blue-500"/>
                Team submissions are not active for the current game phase ({currentPhaseNode?.label || 'N/A'}).
            </div>
        );
    }

    if (teams.length === 0 && !state.isLoading) {
        return <div className="text-center p-4 text-gray-500">No teams have joined the session yet.</div>;
    }

    const handleRefreshSubmissions = async () => {
        if (currentSessionId && currentPhaseIdFromNode) {
            console.log(`[TeamSubmissionTable] Manually refreshing submissions for phase ${currentPhaseIdFromNode}`);
            // Trigger a re-fetch of team decisions
            window.location.reload(); // Simple refresh for now
        }
    };

    return (
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-800">
                    Team Submissions: <span className="text-blue-600">{currentPhaseNode?.label || 'Current Interactive Phase'}</span>
                    {currentPhaseNode && <span className="text-xs text-gray-500 ml-2">(Phase ID: {currentPhaseNode.id})</span>}
                </h3>
                <button
                    onClick={handleRefreshSubmissions}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    title="Refresh submissions"
                >
                    <RefreshCw size={14}/> Refresh
                </button>
            </div>
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
                            <td colSpan={4} className="text-center py-4 text-gray-500">No teams in this session yet.</td>
                        </tr>
                    )}
                    {teams.map((team) => {
                        const decision = getTeamDecisionForCurrentPhase(team.id);
                        const hasSubmitted = !!decision?.submitted_at;

                        return (
                            <tr key={team.id}
                                className={`${hasSubmitted ? 'bg-green-50/70 hover:bg-green-100/70' : 'bg-yellow-50/70 hover:bg-yellow-100/70'} transition-colors`}>
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