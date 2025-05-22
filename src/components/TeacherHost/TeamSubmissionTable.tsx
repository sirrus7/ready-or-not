// src/components/TeacherHost/TeamSubmissionTable.tsx
import React, {useState} from 'react';
import {useAppContext} from '../../context/AppContext';
import {TeamDecision, GamePhaseNode, InvestmentOption, ChallengeOption} from '../../types';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Info} from 'lucide-react';

interface TeamSubmissionTableProps {
    // No props needed directly, it will consume from AppContext
}

const TeamSubmissionTable: React.FC<TeamSubmissionTableProps> = () => {
    const {state, currentPhaseNode, resetTeamDecisionForPhase } = useAppContext(); // Use currentPhaseNode
    const {teams, teamDecisions, currentSessionId, gameStructure} = state;

    // currentPhaseId is now derived from currentPhaseNode
    const currentPhaseIdFromNode = currentPhaseNode?.id;

    const [isLoadingReset, setIsLoadingReset] = useState<Record<string, boolean>>({});

    const getTeamDecisionForCurrentPhase = (teamId: string): TeamDecision | undefined => {
        if (!currentPhaseIdFromNode) return undefined;
        const decisionsByPhase = teamDecisions[teamId] || {};
        return decisionsByPhase[currentPhaseIdFromNode];
    };

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentPhaseNode || !gameStructure) return 'Pending...';

        // Ensure interactive_data_key or phase_id is used correctly for lookup
        const dataKeyForOptions = currentPhaseNode.interactive_data_key || currentPhaseNode.id;

        if (currentPhaseNode.phase_type === 'invest' && decision.selected_investment_ids) {
            const investmentOptionsForPhase = gameStructure.all_investment_options[dataKeyForOptions] || [];
            if (decision.selected_investment_ids.length === 0) return "No Investments Made";

            const selectedNames = decision.selected_investment_ids.map(id => {
                const option = investmentOptionsForPhase.find(opt => opt.id === id);
                return option ? option.name.replace(/^\d+\.\s*/, '') : `ID: ${id.slice(-4)}`;
            }).join(', ');
            return selectedNames || 'Processing...';
        }

        if (currentPhaseNode.phase_type === 'choice' && decision.selected_challenge_option_id) {
            const challengeOptionsForPhase = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const option = challengeOptionsForPhase.find(opt => opt.id === decision.selected_challenge_option_id);
            return option ? `Chose: "${option.text.substring(0,20)}..."` : `Option ID: ${decision.selected_challenge_option_id}`;
        }

        if (currentPhaseNode.phase_type === 'double-down-prompt' && decision.selected_challenge_option_id) {
            // Assuming 'yes_dd' and 'no_dd' are IDs in all_challenge_options[dataKeyForOptions]
            const options = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const chosenOption = options.find(opt => opt.id === decision.selected_challenge_option_id);
            return chosenOption ? chosenOption.text : `Opted: ${decision.selected_challenge_option_id}`;
        }

        if (currentPhaseNode.phase_type === 'double-down-select' && decision.double_down_decision) {
            const dd = decision.double_down_decision;
            // Find the investment options based on rd3-invest key as DD happens on RD3 investments
            const rd3InvestKey = `rd3-invest`; // Assuming this is the key for RD3 investments
            const rd3InvestmentOptions = gameStructure.all_investment_options[rd3InvestKey] || [];

            const sacrificeOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToSacrificeId);
            const doubleDownOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToDoubleDownId);

            if (!dd.investmentToSacrificeId && !dd.investmentToDoubleDownId) return "No DD Selection (Skipped)";

            let details = [];
            if(sacrificeOpt) details.push(`Sacrifice: ${sacrificeOpt.name.replace(/^\d+\.\s*/, '')}`);
            else if(dd.investmentToSacrificeId) details.push(`Sacrifice ID: ${dd.investmentToSacrificeId.slice(-4)}`);

            if(doubleDownOpt) details.push(`Double: ${doubleDownOpt.name.replace(/^\d+\.\s*/, '')}`);
            else if(dd.investmentToDoubleDownId) details.push(`Double ID: ${dd.investmentToDoubleDownId.slice(-4)}`);

            return details.join(', ') || 'Awaiting DD selection';
        }

        if (decision.submitted_at) return 'Submitted (Details N/A for type)';
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
            // AppContext's real-time subscription or explicit state update should refresh this table.
            // No explicit alert here as the UI will update to "Pending"
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


    return (
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3">
                Team Submissions: <span
                className="text-blue-600">{currentPhaseNode?.label || 'Current Interactive Phase'}</span>
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
                    {state.isLoading && teams.length === 0 && ( // Show loading only if teams are also empty
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
                                <td className="px-3 py-2.5 text-gray-600 max-w-xs break-words"> {/* max-w-xs for better control */}
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