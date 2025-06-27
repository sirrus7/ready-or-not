// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect} from 'react';
import {Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, TrendingUp, CheckCircle} from 'lucide-react';
import {DoubleDownEffectsProcessor} from '@core/game/DoubleDownEffectsProcessor';
import {SimpleRealtimeManager} from '@core/sync/SimpleRealtimeManager';
import {db} from '@shared/services/supabase';

interface DiceResult {
    investment_id: string;
    dice1_value: number;
    dice2_value: number;
    total_value: number;
    boost_percentage: number;
    affected_teams: string[];
}

interface KpiChange {
    team_name: string;
    changes: {
        kpi: string;
        change_value: number;
        display_value: string;
    }[];
}

interface DoubleDownDiceDisplayProps {
    sessionId: string;
    investmentId: string;
    investmentName: string;
    slideId: number;
}

// TWO DICE: Sum ranges from 2-12 (using existing correct mapping)
const DICE_BOOSTS = {
    2: 0,      // 0% boost
    3: 25,     // 25% boost
    4: 25,     // 25% boost
    5: 75,     // 75% boost
    6: 75,     // 75% boost
    7: 75,     // 75% boost
    8: 75,     // 75% boost
    9: 100,    // 100% boost (double)
    10: 100,   // 100% boost (double)
    11: 100,   // 100% boost (double)
    12: 100    // 100% boost (double)
} as const;

const DiceIcon: React.FC<{ value: number }> = ({value}) => {
    const icons = {
        1: Dice1,
        2: Dice2,
        3: Dice3,
        4: Dice4,
        5: Dice5,
        6: Dice6
    };
    const Icon = icons[value as keyof typeof icons] || Dice6;
    return <Icon className="w-20 h-20"/>;
};

const DoubleDownDiceDisplay: React.FC<DoubleDownDiceDisplayProps> = ({
                                                                         sessionId,
                                                                         investmentId,
                                                                         investmentName,
                                                                         slideId
                                                                     }) => {
    const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
    const [kpiChanges, setKpiChanges] = useState<KpiChange[]>([]);
    const [isRolling, setIsRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);
    const [hasAppliedEffects, setHasAppliedEffects] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<'loading' | 'showing_teams' | 'rolling' | 'showing_results' | 'applying_effects' | 'complete'>('loading');
    const [affectedTeams, setAffectedTeams] = useState<string[]>([]);

    useEffect(() => {
        initializeDoubleDownRoll();

        // REMOVED: No longer subscribing to unnecessary broadcasts
        // The component manages its own state locally
    }, [sessionId, investmentId]);

    const initializeDoubleDownRoll = async () => {
        try {
            // First, check if this investment has already been processed
            const existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (existingResult) {
                // Already processed - show the completed state
                setDiceResult(existingResult);
                setHasRolled(true);
                setHasAppliedEffects(true);
                setCurrentPhase('complete');

                // FIXED: Set affected teams from existing result
                setAffectedTeams(existingResult.affected_teams || []);

                // Load KPI changes for display if teams were affected
                if (existingResult.affected_teams && existingResult.affected_teams.length > 0) {
                    const changes = await loadKpiChangesForDisplay(existingResult.affected_teams, existingResult.boost_percentage);
                    setKpiChanges(changes);
                }

                return;
            }

            // Get teams that chose to double down on this investment
            const decisions = await db.doubleDown.getTeamsForInvestment(sessionId, investmentId);
            const teamNames = decisions.map(decision => decision.teams.name);

            setAffectedTeams(teamNames);

            if (teamNames.length === 0) {
                // No teams doubled down on this investment
                setCurrentPhase('complete');
                return;
            }

            // Show teams for 3 seconds, then proceed to rolling
            setCurrentPhase('showing_teams');
            setTimeout(() => {
                if (!hasRolled) {
                    rollDice();
                }
            }, 3000);

        } catch (error) {
            console.error('Error initializing double down roll:', error);
            setCurrentPhase('complete');
        }
    };

    const rollDice = async () => {
        if (hasRolled || affectedTeams.length === 0) return;

        setIsRolling(true);
        setCurrentPhase('rolling');

        // Simulate dice rolling animation
        const rollDuration = 2000;
        const rollInterval = 100;
        const animationSteps = rollDuration / rollInterval;

        for (let i = 0; i < animationSteps; i++) {
            await new Promise(resolve => setTimeout(resolve, rollInterval));

            // Show random dice values during rolling
            const tempResult: DiceResult = {
                investment_id: investmentId,
                dice1_value: Math.floor(Math.random() * 6) + 1,
                dice2_value: Math.floor(Math.random() * 6) + 1,
                total_value: 0,
                boost_percentage: 0,
                affected_teams: affectedTeams
            };
            tempResult.total_value = tempResult.dice1_value + tempResult.dice2_value;
            tempResult.boost_percentage = DICE_BOOSTS[tempResult.total_value as keyof typeof DICE_BOOSTS];
            setDiceResult(tempResult);
        }

        // Final dice result
        const finalDice1 = Math.floor(Math.random() * 6) + 1;
        const finalDice2 = Math.floor(Math.random() * 6) + 1;
        const finalTotal = finalDice1 + finalDice2;
        const finalBoost = DICE_BOOSTS[finalTotal as keyof typeof DICE_BOOSTS];

        const result: DiceResult = {
            investment_id: investmentId,
            dice1_value: finalDice1,
            dice2_value: finalDice2,
            total_value: finalTotal,
            boost_percentage: finalBoost,
            affected_teams: affectedTeams
        };

        setDiceResult(result);
        setIsRolling(false);
        setHasRolled(true);
        setCurrentPhase('showing_results');

        // Save to database
        await saveResult(result);

        // Show results for 3 seconds, then apply effects
        setTimeout(async () => {
            await applyDoubleDownEffects(result);
        }, 3000);
    };

    const saveResult = async (result: DiceResult) => {
        try {
            // Check if result already exists before saving
            const existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (existingResult) {
                console.log(`[DoubleDownDiceDisplay] Result already exists for investment ${investmentId}, skipping save`);
                return;
            }

            await db.doubleDown.saveResult(sessionId, investmentId, {
                dice1_value: result.dice1_value,
                dice2_value: result.dice2_value,
                total_value: result.total_value,
                boost_percentage: result.boost_percentage,
                affected_teams: result.affected_teams
            });

            console.log(`[DoubleDownDiceDisplay] Successfully saved result for investment ${investmentId}`);

            // REMOVED: No longer broadcasting dice-roll events - unnecessary complexity

        } catch (error) {
            console.error('Error saving dice result:', error);
        }
    };

    const applyDoubleDownEffects = async (result: DiceResult) => {
        if (hasAppliedEffects || result.affected_teams.length === 0) {
            console.log(`[DoubleDownDiceDisplay] Skipping effects application - already applied: ${hasAppliedEffects}, teams: ${result.affected_teams.length}`);
            return;
        }

        setCurrentPhase('applying_effects');

        try {
            console.log(`[DoubleDownDiceDisplay] Applying effects for investment ${investmentId} with ${result.boost_percentage}% boost`);

            // Apply effects using the existing processor (updates database)
            await DoubleDownEffectsProcessor.processDoubleDownForInvestment(
                sessionId,
                investmentId,
                result.boost_percentage
            );

            // Get the KPI changes for display (local display only)
            const changes = await loadKpiChangesForDisplay(result.affected_teams, result.boost_percentage);
            setKpiChanges(changes);

            setHasAppliedEffects(true);
            setCurrentPhase('complete');

            console.log(`[DoubleDownDiceDisplay] Successfully applied effects for investment ${investmentId}`);

            // FIXED: Use centralized real-time system to notify teams
            const realtimeManager = SimpleRealtimeManager.getInstance(sessionId, 'host');

            // Create a mock slide object for the sendKpiUpdated method
            const mockSlide = {
                id: slideId,
                type: 'double_down_dice_roll' as const,
                round_number: 3,
                title: `Bonus: ${investmentName}`,
                interactive_data_key: investmentId
            };

            // Broadcast KPI update - teams will refresh their KPIs from database
            realtimeManager.sendKpiUpdated(mockSlide, {
                // Additional context for teams (optional)
                doubleDownApplied: true,
                investment_name: investmentName,
                boost_percentage: result.boost_percentage,
                affected_teams: result.affected_teams
            });

            console.log(`[DoubleDownDiceDisplay] 📱 Broadcasted KPI update to teams via team-events-${sessionId}`);

        } catch (error) {
            console.error('Error applying double down effects:', error);
            setCurrentPhase('complete');
        }
    };

    const loadKpiChangesForDisplay = async (teamNames: string[], boostPercentage: number): Promise<KpiChange[]> => {
        try {
            // Get the KPI changes for this investment
            const kpiChanges = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
                sessionId,
                investmentId,
                boostPercentage
            );

            // Convert to display format grouped by team
            return teamNames.map(teamName => ({
                team_name: teamName,
                changes: kpiChanges
            }));
        } catch (error) {
            console.error('Error loading KPI changes for display:', error);
            return [];
        }
    };

    const loadExistingKpiChanges = async () => {
        // Load previously calculated KPI changes if they exist
        // This would be implemented based on how KPI changes are stored
        setKpiChanges([]);
    };

    const getBoostColor = (boost: number) => {
        if (boost === 100) return 'text-green-400';
        if (boost === 75) return 'text-blue-400';
        if (boost === 25) return 'text-yellow-400';
        return 'text-gray-400';
    };

    const formatKpiChange = (change: { kpi: string; change_value: number; display_value: string }) => {
        const sign = change.change_value >= 0 ? '+' : '';
        const color = change.change_value >= 0 ? 'text-green-400' : 'text-red-400';

        return (
            <span className={`${color} font-medium`}>
                {sign}{change.display_value} {change.kpi.toUpperCase()}
            </span>
        );
    };

    const getPhaseDisplay = () => {
        switch (currentPhase) {
            case 'loading':
                return (
                    <div className="text-center text-gray-400">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        Loading double down data...
                    </div>
                );

            case 'showing_teams':
                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <h3 className="text-2xl font-bold text-white mb-6">
                            Teams Doubling Down:
                        </h3>
                        <div className="space-y-3 mb-6">
                            {affectedTeams.map((team, index) => (
                                <div key={index}
                                     className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-6 py-3">
                                    <span className="text-xl font-medium text-white">{team}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-gray-300 text-lg">
                            Rolling dice automatically in 3... 2... 1...
                        </div>
                    </div>
                );

            case 'rolling':
                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <h3 className="text-2xl font-bold text-white mb-8">Rolling Dice...</h3>
                        <div className="animate-bounce">
                            <div className="flex gap-4 justify-center mb-6">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice1_value || 1}/>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice2_value || 1}/>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'showing_results':
                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <h3 className="text-2xl font-bold text-white mb-4">Final Result:</h3>
                        <div className="flex gap-4 justify-center mb-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                <DiceIcon value={diceResult?.dice1_value || 1}/>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                <DiceIcon value={diceResult?.dice2_value || 1}/>
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-white mb-4">
                            Total: {diceResult?.total_value}
                        </div>
                        <div className={`text-3xl font-bold mb-6 ${getBoostColor(diceResult?.boost_percentage || 0)}`}>
                            {diceResult?.boost_percentage}%
                            Boost {diceResult?.boost_percentage === 100 ? 'Applied' : 'Applied'}
                        </div>
                        <div className="text-gray-300">
                            Applying effects to team KPIs...
                        </div>
                    </div>
                );

            case 'applying_effects':
                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <div className="animate-pulse">
                            <TrendingUp className="mx-auto mb-4 text-green-400" size={64}/>
                            <div className="text-2xl font-bold text-white mb-4">
                                Applying effects to team KPIs...
                            </div>
                        </div>
                    </div>
                );

            case 'complete':
                if (affectedTeams.length === 0) {
                    return (
                        <div className="text-center">
                            <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {investmentName}
                            </h2>
                            <Users className="mx-auto mb-4 text-gray-400" size={64}/>
                            <div className="text-2xl text-gray-400">
                                No teams doubled down on this investment
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>

                        {diceResult && (
                            <>
                                <div className="flex gap-4 justify-center mb-6">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-inner">
                                        <DiceIcon value={diceResult.dice1_value}/>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-inner">
                                        <DiceIcon value={diceResult.dice2_value}/>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-white mb-2">
                                    Total: {diceResult.total_value}
                                </div>
                                <div
                                    className={`text-2xl font-bold mb-6 ${getBoostColor(diceResult.boost_percentage)}`}>
                                    {diceResult.boost_percentage}% Boost Applied
                                </div>

                                {diceResult.boost_percentage > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                                            <TrendingUp size={24}/>
                                            Teams Receiving {diceResult.boost_percentage}% Bonus
                                        </h3>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {affectedTeams.map((team, index) => (
                                                <div key={index}
                                                     className="bg-blue-600/30 border border-blue-500/50 rounded-lg px-4 py-2">
                                                    <span className="text-lg font-medium text-white">{team}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {kpiChanges.length > 0 && (
                            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mt-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                                    📊 KPI Changes - Update Your Physical Boards!
                                </h3>
                                <div className="space-y-4">
                                    {kpiChanges.map((teamChange, index) => (
                                        <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                                            <div className="text-lg font-semibold text-white mb-2">
                                                {teamChange.team_name}
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {teamChange.changes.map((change, changeIndex) => (
                                                    <div key={changeIndex}>
                                                        {formatKpiChange(change)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-sm text-gray-400 mt-4">
                                    Teams: Check your apps to verify these numbers match your physical boards!
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <CheckCircle className="mx-auto text-green-400" size={32}/>
                            <div className="text-green-400 font-semibold mt-2">
                                Double Down Complete!
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
            <div className="max-w-4xl mx-auto">
                {getPhaseDisplay()}
            </div>
        </div>
    );
};

export default DoubleDownDiceDisplay;
