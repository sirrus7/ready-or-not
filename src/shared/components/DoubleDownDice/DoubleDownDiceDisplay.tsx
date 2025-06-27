// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect} from 'react';
import {Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, TrendingUp, CheckCircle} from 'lucide-react';
import {supabase} from '@shared/services/supabase';
import {DoubleDownEffectsProcessor} from '@core/game/DoubleDownEffectsProcessor';
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

        // Subscribe to dice roll events
        const subscription = supabase
            .channel(`dice-roll-${sessionId}-${investmentId}`)
            .on('broadcast', {event: 'dice-rolled'}, ({payload}) => {
                if (payload.investment_id === investmentId) {
                    setDiceResult(payload);
                    setHasRolled(true);
                    setCurrentPhase('showing_results');
                    // Apply effects after showing results
                    setTimeout(() => applyDoubleDownEffects(payload), 3000);
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
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
                // Load any existing KPI changes for display
                await loadExistingKpiChanges();
                return;
            }

            // Get teams that chose to double down on this investment
            const decisions = await db.doubleDown.getTeamsForInvestment(sessionId, investmentId);
            const teamsForThisInvestment = decisions.map(d => d.teams?.name || 'Unknown Team');
            setAffectedTeams(teamsForThisInvestment);

            if (teamsForThisInvestment.length === 0) {
                // No teams chose this investment
                setDiceResult({
                    investment_id: investmentId,
                    dice1_value: 0,
                    dice2_value: 0,
                    total_value: 0,
                    boost_percentage: 0,
                    affected_teams: []
                });
                setCurrentPhase('complete');
                return;
            }

            // Show teams for 2 seconds, then start rolling automatically
            setCurrentPhase('showing_teams');
            setTimeout(() => {
                startAutomaticRoll(teamsForThisInvestment);
            }, 2000);

        } catch (error) {
            console.error('Error initializing double down roll:', error);
            setCurrentPhase('complete');
        }
    };

    const startAutomaticRoll = async (teams: string[]) => {
        setCurrentPhase('rolling');
        setIsRolling(true);

        // Simulate dice roll animation for 2 seconds
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const tempDice1 = Math.floor(Math.random() * 6) + 1;
            const tempDice2 = Math.floor(Math.random() * 6) + 1;

            setDiceResult({
                investment_id: investmentId,
                dice1_value: tempDice1,
                dice2_value: tempDice2,
                total_value: tempDice1 + tempDice2,
                boost_percentage: 0,
                affected_teams: teams
            });

            rollCount++;

            if (rollCount > 20) {
                clearInterval(rollInterval);
                finalizeDiceRoll(teams);
            }
        }, 100);
    };

    const finalizeDiceRoll = async (teams: string[]) => {
        // Final roll with real result
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
            affected_teams: teams
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
            await db.doubleDown.saveResult(sessionId, investmentId, {
                dice1_value: result.dice1_value,
                dice2_value: result.dice2_value,
                total_value: result.total_value,
                boost_percentage: result.boost_percentage,
                affected_teams: result.affected_teams
            });

            // Broadcast to other viewers
            supabase.channel(`dice-roll-${sessionId}-${investmentId}`).send({
                type: 'broadcast',
                event: 'dice-rolled',
                payload: result
            });
        } catch (error) {
            console.error('Error saving dice result:', error);
        }
    };

    const applyDoubleDownEffects = async (result: DiceResult) => {
        if (hasAppliedEffects || result.affected_teams.length === 0) return;

        setCurrentPhase('applying_effects');

        try {
            // Apply effects using the existing processor
            await DoubleDownEffectsProcessor.processDoubleDownForInvestment(
                sessionId,
                investmentId,
                result.boost_percentage
            );

            // Get the KPI changes for display
            const changes = await loadKpiChangesForDisplay(result.affected_teams, result.boost_percentage);
            setKpiChanges(changes);

            setHasAppliedEffects(true);
            setCurrentPhase('complete');

            // Broadcast KPI updates to team apps
            supabase.channel(`kpi-updates-${sessionId}`).send({
                type: 'broadcast',
                event: 'double-down-applied',
                payload: {
                    investment_id: investmentId,
                    investment_name: investmentName,
                    boost_percentage: result.boost_percentage,
                    changes: changes
                }
            });

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
                            Rolling dice in 3... 2... 1...
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
                        <h3 className="text-2xl font-bold text-white mb-6">Final Result:</h3>
                        <div className="flex gap-4 justify-center mb-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                <DiceIcon value={diceResult?.dice1_value || 1}/>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                <DiceIcon value={diceResult?.dice2_value || 1}/>
                            </div>
                        </div>
                        <div className="text-6xl font-bold text-white mb-2">
                            {diceResult?.total_value}
                        </div>
                        <div className={`text-4xl font-bold ${getBoostColor(diceResult?.boost_percentage || 0)}`}>
                            {diceResult?.boost_percentage}% Boost!
                        </div>
                        <div className="mt-6 text-gray-300">
                            Applying effects to team KPIs...
                        </div>
                    </div>
                );

            case 'applying_effects':
                return (
                    <div className="text-center">
                        <div
                            className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                        <div className="text-2xl text-white mb-2">Updating Team KPIs...</div>
                        <div className="text-gray-300">Applying {diceResult?.boost_percentage}% bonus to investments
                        </div>
                    </div>
                );

            case 'complete':
                if (diceResult && affectedTeams.length === 0) {
                    return (
                        <div className="text-center text-gray-400">
                            <h2 className="text-4xl font-bold mb-4">{investmentName}</h2>
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-600"/>
                            <div className="text-2xl">No teams doubled down on this investment</div>
                        </div>
                    );
                }

                return (
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-6">
                            <CheckCircle className="w-12 h-12 text-green-400 mr-3"/>
                            <h2 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {investmentName}
                            </h2>
                        </div>

                        {diceResult && (
                            <>
                                <div className="flex gap-4 justify-center mb-6">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                        <DiceIcon value={diceResult.dice1_value}/>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                        <DiceIcon value={diceResult.dice2_value}/>
                                    </div>
                                </div>
                                <div className="text-4xl font-bold text-white mb-2">
                                    Total: {diceResult.total_value}
                                </div>
                                <div className={`text-3xl font-bold ${getBoostColor(diceResult.boost_percentage)}`}>
                                    {diceResult.boost_percentage}% Boost Applied
                                </div>

                                {/* Teams that received the boost */}
                                <div className="mt-8 bg-slate-700/50 rounded-xl p-6">
                                    <h3 className="text-2xl font-semibold text-gray-300 mb-4 flex items-center justify-center">
                                        <TrendingUp className="mr-2"/>
                                        Teams Receiving {diceResult.boost_percentage}% Bonus
                                    </h3>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        {diceResult.affected_teams.map((team, index) => (
                                            <div
                                                key={index}
                                                className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg px-6 py-3"
                                            >
                                                <span className="text-xl font-medium text-white">{team}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* KPI Changes Display */}
                                {kpiChanges.length > 0 && (
                                    <div className="mt-6 bg-slate-600/50 rounded-xl p-6">
                                        <h4 className="text-xl font-semibold text-white mb-4 flex items-center justify-center">
                                            📊 KPI Changes - Update Your Physical Boards!
                                        </h4>
                                        <div className="space-y-3">
                                            {kpiChanges.map((teamChange, index) => (
                                                <div key={index} className="bg-slate-500/50 rounded-lg p-3">
                                                    <div className="text-lg font-bold text-white mb-1">
                                                        {teamChange.team_name}
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 justify-center">
                                                        {teamChange.changes.map((change, changeIndex) => (
                                                            <div key={changeIndex} className="text-sm">
                                                                {formatKpiChange(change)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 text-xs text-gray-300">
                                            Teams: Check your apps to verify these numbers match your physical boards!
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
        }
    };

    return (
        <div
            className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            <div
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-slate-700 max-w-4xl w-full">
                {getPhaseDisplay()}
            </div>
        </div>
    );
};

export default DoubleDownDiceDisplay;
