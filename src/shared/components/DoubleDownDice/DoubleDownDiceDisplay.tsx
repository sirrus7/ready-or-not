// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect, useRef} from 'react';
import {Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, TrendingUp, CheckCircle, BarChart} from 'lucide-react';
import {DoubleDownEffectsProcessor} from '@core/game/DoubleDownEffectsProcessor';
import {SimpleRealtimeManager} from '@core/sync/SimpleRealtimeManager';
import {db} from '@shared/services/supabase';
import {DoubleDownDecision, DoubleDownResult, KpiChange, Slide, TeamRoundData} from "@shared/types";
import {formatCurrency, formatNumber} from "@shared/utils/formatUtils";

type DiceResult = Omit<DoubleDownResult, 'id' | 'created_at' | 'session_id'>;

interface DoubleDownDiceDisplayProps {
    sessionId: string;
    investmentId: string;
    investmentName: string;
    slideId: number;
    isHost?: boolean;
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
                                                                         slideId,
                                                                         isHost = false
                                                                     }) => {
    const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
    const [kpiChanges, setKpiChanges] = useState<KpiChange[]>([]);
    const [hasRolled, setHasRolled] = useState(false);
    const [hasAppliedEffects, setHasAppliedEffects] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<'loading' | 'showing_teams' | 'rolling' | 'showing_results' | 'applying_effects' | 'complete'>('loading');
    const [affectedTeams, setAffectedTeams] = useState<string[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initializeDoubleDownRoll();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [sessionId, investmentId, slideId]);

    const waitForHostResult = async (teamNames: string[]) => {
        console.log('[DoubleDownDiceDisplay] PRESENTATION: Waiting for host result...');

        setCurrentPhase('rolling');

        // Show rolling animation while waiting
        const rollInterval = setInterval(() => {
            const tempResult: DiceResult = {
                investment_id: investmentId,
                dice1_value: Math.floor(Math.random() * 6) + 1,
                dice2_value: Math.floor(Math.random() * 6) + 1,
                total_value: 0,
                boost_percentage: 0,
                affected_teams: teamNames
            };
            tempResult.total_value = tempResult.dice1_value + tempResult.dice2_value;
            tempResult.boost_percentage = DICE_BOOSTS[tempResult.total_value as keyof typeof DICE_BOOSTS];
            setDiceResult(tempResult);
        }, 100);

        // Poll for host result
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds total

        while (attempts < maxAttempts && !hasRolled) {
            const existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (existingResult) {
                clearInterval(rollInterval);

                const finalResult: DiceResult = {
                    investment_id: existingResult.investment_id,
                    dice1_value: existingResult.dice1_value,
                    dice2_value: existingResult.dice2_value,
                    total_value: existingResult.total_value,
                    boost_percentage: existingResult.boost_percentage,
                    affected_teams: existingResult.affected_teams || teamNames
                };

                setDiceResult(finalResult);
                setHasRolled(true);
                setCurrentPhase('showing_results');

                // FIX #3: Presentation should only get display changes, not apply effects
                setTimeout(async () => {
                    await applyEffectsAsPresentation(finalResult);
                    setHasAppliedEffects(true);
                    setCurrentPhase('complete');
                }, 3000);

                return;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        clearInterval(rollInterval);
        console.error('[DoubleDownDiceDisplay] PRESENTATION: Timeout waiting for host result');
        setCurrentPhase('complete');
    };

    const initializeDoubleDownRoll = async () => {
        try {
            console.log(`[DoubleDownDiceDisplay] Initializing for slide ${slideId}, investment ${investmentId}`);

            // RESET STATE when moving to new investment
            setDiceResult(null);
            setKpiChanges([]);
            setHasRolled(false);
            setHasAppliedEffects(false);
            setCurrentPhase('loading');
            setAffectedTeams([]);

            // First, check if this investment has already been processed
            const existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);
            console.log(`[DoubleDownDiceDisplay] Existing result for ${investmentId}:`, existingResult);

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
                    const displayChanges = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
                        sessionId,
                        investmentId,
                        existingResult.boost_percentage
                    );

                    // Format for the component's KpiChange interface
                    const formattedChanges: KpiChange[] = existingResult.affected_teams.map(teamName => ({
                        team_name: teamName,
                        changes: displayChanges
                    }));

                    setKpiChanges(formattedChanges);
                }

                return;
            }

            // Get teams that chose to double down on this investment
            const decisions: DoubleDownDecision[] = await db.decisions.getTeamsDoubledDownOnInvestment(sessionId, investmentId);
            const teamNames: string[] = decisions.map(decision => decision.team_name);

            setAffectedTeams(teamNames);

            if (teamNames.length === 0) {
                // No teams doubled down on this investment
                setCurrentPhase('complete');
                return;
            }

            // Show teams for 3 seconds, then proceed based on mode
            setCurrentPhase('showing_teams');

            timeoutRef.current = setTimeout(() => {
                console.log('[DoubleDownDiceDisplay] setTimeout fired with captured teamNames:', teamNames);

                if (isHost) {
                    // HOST: Roll dice and save result
                    if (!hasRolled && teamNames.length > 0) {
                        rollDice(teamNames);
                    }
                } else {
                    // PRESENTATION: Wait for host result (don't roll independently)
                    waitForHostResult(teamNames);
                }
            }, 3000);

        } catch (error) {
            console.error('Error initializing double down roll:', error);
            setCurrentPhase('complete');
        }
    };

    const rollDice = async (teams?: string[]) => {
        // Use parameter if provided, otherwise fall back to state
        const teamsToUse = teams || affectedTeams;

        if (hasRolled || teamsToUse.length === 0) {
            console.log('[DoubleDownDiceDisplay] BLOCKING roll - hasRolled:', hasRolled, 'teamsToUse.length:', teamsToUse.length);
            return;
        }

        console.log('[DoubleDownDiceDisplay] ✅ Proceeding with dice roll for teams:', teamsToUse);

        setCurrentPhase('rolling');

        let finalDice1: number;
        let finalDice2: number;
        let finalTotal: number;
        let finalBoost: number;

        if (isHost) {
            // HOST: Generate random dice results
            console.log('[DoubleDownDiceDisplay] HOST: Generating random dice results');

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
                    affected_teams: teamsToUse
                };
                tempResult.total_value = tempResult.dice1_value + tempResult.dice2_value;
                tempResult.boost_percentage = DICE_BOOSTS[tempResult.total_value as keyof typeof DICE_BOOSTS];
                setDiceResult(tempResult);
            }

            // Generate final dice result
            finalDice1 = Math.floor(Math.random() * 6) + 1;
            finalDice2 = Math.floor(Math.random() * 6) + 1;
            finalTotal = finalDice1 + finalDice2;
            finalBoost = DICE_BOOSTS[finalTotal as keyof typeof DICE_BOOSTS];

            console.log('[DoubleDownDiceDisplay] HOST: Generated dice results:', {
                finalDice1,
                finalDice2,
                finalTotal,
                finalBoost
            });
        } else {
            // PRESENTATION: Fetch results from database
            console.log('[DoubleDownDiceDisplay] PRESENTATION: Fetching dice results from database');

            // Show rolling animation while fetching
            const rollDuration = 2000;
            const rollInterval = 100;
            const animationSteps = rollDuration / rollInterval;

            for (let i = 0; i < animationSteps; i++) {
                await new Promise(resolve => setTimeout(resolve, rollInterval));

                // Show random dice values during rolling (just for animation)
                const tempResult: DiceResult = {
                    investment_id: investmentId,
                    dice1_value: Math.floor(Math.random() * 6) + 1,
                    dice2_value: Math.floor(Math.random() * 6) + 1,
                    total_value: 0,
                    boost_percentage: 0,
                    affected_teams: teamsToUse
                };
                tempResult.total_value = tempResult.dice1_value + tempResult.dice2_value;
                tempResult.boost_percentage = DICE_BOOSTS[tempResult.total_value as keyof typeof DICE_BOOSTS];
                setDiceResult(tempResult);
            }

            // Fetch results from database (retry until available)
            let existingResult = null;
            let attempts = 0;
            const maxAttempts = 10;

            while (!existingResult && attempts < maxAttempts) {
                existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);
                if (!existingResult) {
                    console.log('[DoubleDownDiceDisplay] PRESENTATION: No result found, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
            }

            if (!existingResult) {
                console.error('[DoubleDownDiceDisplay] PRESENTATION: No dice result found after retries');
                setCurrentPhase('complete');
                return;
            }

            finalDice1 = existingResult.dice1_value;
            finalDice2 = existingResult.dice2_value;
            finalTotal = existingResult.total_value;
            finalBoost = existingResult.boost_percentage;

            console.log('[DoubleDownDiceDisplay] PRESENTATION: Using database results:', {
                finalDice1,
                finalDice2,
                finalTotal,
                finalBoost
            });
        }

        const result: DiceResult = {
            investment_id: investmentId,
            dice1_value: finalDice1,
            dice2_value: finalDice2,
            total_value: finalTotal,
            boost_percentage: finalBoost,
            affected_teams: teamsToUse
        };

        setDiceResult(result);
        setHasRolled(true);
        setCurrentPhase('showing_results');

        // Only save if host
        if (isHost) {
            await saveResult(result);
        }

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

            await db.doubleDown.saveResult({
                session_id: sessionId,
                investment_id: investmentId,
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

    const getBeforeKpiValues = async (teamDecisions: DoubleDownDecision[]): Promise<Record<string, TeamRoundData | null>> => {
        const beforeValues: Record<string, TeamRoundData | null> = {};
        for (const decision of teamDecisions) {
            beforeValues[decision.team_id] = await db.kpis.getForTeamRound(sessionId, decision.team_id, 3);
        }
        return beforeValues;
    };

    const calculateActualChanges = async (teamDecisions: DoubleDownDecision[], beforeValues: Record<string, TeamRoundData | null>): Promise<KpiChange[]> => {
        const actualChanges: KpiChange[] = [];

        for (const decision of teamDecisions) {
            const teamId = decision.team_id;
            const teamName = decision.team_name;
            const beforeKpis = beforeValues[teamId];
            const afterKpis = await db.kpis.getForTeamRound(sessionId, teamId, 3);

            if (beforeKpis && afterKpis) {
                const changes = [
                    {
                        kpi: 'capacity',
                        change_value: afterKpis.current_capacity - beforeKpis.current_capacity,
                        display_value: `${afterKpis.current_capacity - beforeKpis.current_capacity}`
                    },
                    {
                        kpi: 'cost',
                        change_value: afterKpis.current_cost - beforeKpis.current_cost,
                        display_value: `$${(afterKpis.current_cost - beforeKpis.current_cost).toLocaleString()}`
                    }
                ].filter(change => change.change_value !== 0);

                actualChanges.push({
                    team_name: teamName,
                    changes
                });
            }
        }

        return actualChanges;
    };

    const getUpdatedKpisForBroadcast = async (teamDecisions: DoubleDownDecision[]): Promise<Record<string, TeamRoundData | null>> => {
        const updatedKpis: Record<string, TeamRoundData | null> = {};

        for (const decision of teamDecisions) {
            const teamId: string = decision.team_id;
            const afterKpis: TeamRoundData | null = await db.kpis.getForTeamRound(sessionId, teamId, 3);
            if (afterKpis) {
                updatedKpis[teamId] = afterKpis;
            }
        }

        return updatedKpis;
    };

    const broadcastKpiUpdatesToTeams = async (updatedKpis: Record<string, TeamRoundData | null>, result: DiceResult): Promise<void> => {
        const realtimeManager: SimpleRealtimeManager = SimpleRealtimeManager.getInstance(sessionId, 'host');

        const mockSlide: Slide = {
            id: slideId,
            type: 'double_down_dice_roll' as const,
            round_number: 3,
            title: `Bonus: ${investmentName}`,
            interactive_data_key: investmentId
        };

        realtimeManager.sendKpiUpdated(mockSlide, {
            updatedKpis,
            investmentId,
            investmentName,
            boostPercentage: result.boost_percentage,
            message: `Double Down bonus applied: ${result.boost_percentage}% boost from ${investmentName}`
        });

        console.log(`[DoubleDownDiceDisplay] Broadcasted KPI data to teams`);
    };

    const applyEffectsAsHost = async (result: DiceResult) => {
        console.log(`[DoubleDownDiceDisplay] HOST: Applying effects to database`);

        // Get team data and before values
        const teamDecisions: DoubleDownDecision[] = await db.decisions.getTeamsDoubledDownOnInvestment(sessionId, investmentId);
        const beforeValues: Record<string, TeamRoundData | null> = await getBeforeKpiValues(teamDecisions);

        // Apply effects to database
        await DoubleDownEffectsProcessor.processDoubleDownForInvestment(
            sessionId,
            investmentId,
            result.boost_percentage
        );

        // Calculate actual changes and broadcast
        const actualChanges: KpiChange[] = await calculateActualChanges(teamDecisions, beforeValues);
        const updatedKpis: Record<string, TeamRoundData | null> = await getUpdatedKpisForBroadcast(teamDecisions);

        setKpiChanges(actualChanges);
        await broadcastKpiUpdatesToTeams(updatedKpis, result);

        console.log(`[DoubleDownDiceDisplay] HOST: Applied effects and broadcasted to teams`);
    };

    const applyEffectsAsPresentation = async (result: DiceResult) => {
        console.log(`[DoubleDownDiceDisplay] PRESENTATION: Getting display changes only`);

        const displayChanges = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
            sessionId,
            investmentId,
            result.boost_percentage
        );

        const formattedChanges: KpiChange[] = result.affected_teams.map(teamName => ({
            team_name: teamName,
            changes: displayChanges
        }));

        setKpiChanges(formattedChanges);
        console.log(`[DoubleDownDiceDisplay] PRESENTATION: Set display changes`);
    };

    const applyDoubleDownEffects = async (result: DiceResult) => {
        if (hasAppliedEffects || result.affected_teams.length === 0) {
            console.log(`[DoubleDownDiceDisplay] Skipping effects application - already applied: ${hasAppliedEffects}, teams: ${result.affected_teams.length}`);
            return;
        }

        setCurrentPhase('applying_effects');

        try {
            console.log(`[DoubleDownDiceDisplay] Applying effects for investment ${investmentId} with ${result.boost_percentage}% boost`);

            if (isHost) {
                await applyEffectsAsHost(result);
            } else {
                await applyEffectsAsPresentation(result);
            }

            setHasAppliedEffects(true);
            setCurrentPhase('complete');
            console.log(`[DoubleDownDiceDisplay] Successfully completed effects application for investment ${investmentId}`);

        } catch (error) {
            console.error('[DoubleDownDiceDisplay] Error applying double down effects:', error);
            setCurrentPhase('complete');
        }
    };

    const getBoostColor = (boost: number) => {
        if (boost === 100) return 'text-green-400';
        if (boost === 75) return 'text-blue-400';
        if (boost === 25) return 'text-yellow-400';
        return 'text-gray-400';
    };

    const formatKpiChange = (change: { kpi: string; change_value: number; display_value: string }) => {
        const sign = change.change_value >= 0 ? '+' : '';

        // Color logic based on KPI type
        let color;
        if (change.kpi === 'cost') {
            // For cost: increase is bad (red), decrease is good (green)
            color = change.change_value >= 0 ? 'text-red-400' : 'text-green-400';
        } else {
            // For capacity, orders, revenue, etc.: increase is good (green), decrease is bad (red)
            color = change.change_value >= 0 ? 'text-green-400' : 'text-red-400';
        }

        // Use shared formatting utilities
        const formattedValue = change.kpi === 'capacity' || change.kpi === 'orders'
            ? formatNumber(change.change_value)
            : formatCurrency(change.change_value);

        // Add KPI label
        const kpiLabel = change.kpi.toUpperCase();

        return (
            <span className={color}>
            {sign}{formattedValue} {kpiLabel}
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
                                     className="bg-game-orange-600/20 border border-game-orange-500/30 rounded-lg px-6 py-3">
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
                                                     className="bg-game-orange-600/30 border border-game-orange-500/50 rounded-lg px-4 py-2">
                                                    <span className="text-lg font-medium text-white">{team}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* KPI Changes Display */}
                        {kpiChanges.length > 0 && (
                            <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex items-center justify-center mb-4">
                                    <BarChart className="w-5 h-5 text-blue-400 mr-2"/>
                                    <h3 className="text-lg font-semibold text-white">KPI Changes - Update Your Physical
                                        Boards!</h3>
                                </div>

                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <div className="text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {kpiChanges[0]?.changes.map((change, changeIndex) => (
                                                <div key={changeIndex} className="text-lg font-bold">
                                                    {formatKpiChange(change)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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
