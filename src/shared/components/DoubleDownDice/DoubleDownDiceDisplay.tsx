// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect, useRef} from 'react';
import {Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, TrendingUp} from 'lucide-react';
import {DoubleDownEffectsProcessor} from '@core/game/DoubleDownEffectsProcessor';
import {SimpleRealtimeManager} from '@core/sync/SimpleRealtimeManager';
import {db} from '@shared/services/supabase';
import {DoubleDownDecision, DoubleDownResult, KpiChange, Slide, TeamRoundData} from "@shared/types";
import {formatCurrency, formatNumber} from "@shared/utils/formatUtils";
import {DoubleDownAudioManager} from '@shared/utils/audio';

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
    return <Icon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 text-white"/>;
};

const DoubleDownDiceDisplay: React.FC<DoubleDownDiceDisplayProps> = ({
                                                                         sessionId,
                                                                         investmentId,
                                                                         investmentName,
                                                                         slideId,
                                                                         isHost = false
                                                                     }: DoubleDownDiceDisplayProps) => {
    console.log('🔍 [DEBUG] DoubleDownDiceDisplay COMPONENT MOUNTED/RENDERED:', {
        slideId,
        investmentId,
        isHost
    });
    const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
    const [kpiChanges, setKpiChanges] = useState<KpiChange[]>([]);
    const [hasRolled, setHasRolled] = useState(false);
    const [hasAppliedEffects, setHasAppliedEffects] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<'loading' | 'showing_teams' | 'rolling' | 'showing_results' | 'applying_effects' | 'complete'>('loading');
    const [affectedTeams, setAffectedTeams] = useState<string[]>([]);
    const processingRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioManager: DoubleDownAudioManager = DoubleDownAudioManager.getInstance();

    useEffect((): () => void => {
        console.log('🔍 [DEBUG] useEffect firing for initializeDoubleDownRoll:', {
            slideId,
            investmentId,
            sessionId
        });

        initializeDoubleDownRoll();

        return (): void => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            audioManager.cleanupAudio(investmentId);
        };
    }, [slideId, investmentId, sessionId]);

    useEffect((): void => {
        if (currentPhase === 'showing_teams' && affectedTeams.length > 0) {
            audioManager.playIntroAudio(investmentId);
        }
    }, [currentPhase, affectedTeams.length]);

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
        let attempts: number = 0;
        const maxAttempts: number = 20; // 10 seconds total

        while (attempts < maxAttempts && !hasRolled) {
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

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
                    if (finalResult) {
                        // Play result audio immediately when dice settle
                        audioManager.playResultAudio(investmentId, finalResult.total_value);

                        // Wait a bit for audio to start, then apply effects
                        await applyEffectsAsPresentation(finalResult);
                        setHasAppliedEffects(true);
                        setCurrentPhase('complete');
                    }
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

    const initializeDoubleDownRoll: () => Promise<void> = async (): Promise<void> => {
        console.log('🔍 [DEBUG] initializeDoubleDownRoll called:', {
            slideId,
            investmentId,
            isHost,
            hasRolled,
            hasAppliedEffects,
            currentPhase,
            isProcessing: processingRef.current
        });

        // CRITICAL: Prevent multiple simultaneous executions
        if (processingRef.current) {
            console.log('[DoubleDownDiceDisplay] BLOCKED: Already processing initialization');
            return;
        }

        processingRef.current = true;
        setCurrentPhase('loading');

        try {
            // Check for existing result FIRST (your existing code)
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);
            if (existingResult) {
                console.log('[DoubleDownDiceDisplay] Result already exists, using existing result');

                const finalResult: DiceResult = {
                    investment_id: existingResult.investment_id,
                    dice1_value: existingResult.dice1_value,
                    dice2_value: existingResult.dice2_value,
                    total_value: existingResult.total_value,
                    boost_percentage: existingResult.boost_percentage,
                    affected_teams: existingResult.affected_teams || []
                };

                setDiceResult(finalResult);
                setAffectedTeams(finalResult.affected_teams);
                setHasRolled(true);
                setCurrentPhase('complete');

                // Load existing KPI changes if available
                if (finalResult.affected_teams && finalResult.affected_teams.length > 0) {
                    const displayChanges = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
                        sessionId,
                        investmentId,
                        finalResult.boost_percentage
                    );

                    const formattedChanges: KpiChange[] = finalResult.affected_teams.map(teamName => ({
                        team_name: teamName,
                        changes: displayChanges
                    }));

                    setKpiChanges(formattedChanges);
                }

                return; // 🚨 EXIT EARLY - don't continue with the rest of the initialization
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
            audioManager.loadIntroAudio(investmentId);

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
        } finally {
            // Always clear the processing lock
            processingRef.current = false;
        }
    };

    // Add this method above the existing rollDice method
    const simulateDiceAnimation = async (teamsToUse: string[], duration: number = 2000): Promise<void> => {
        const rollInterval = 200; // Reduced frequency
        const animationSteps = duration / rollInterval;

        for (let i = 0; i < animationSteps; i++) {
            await new Promise(resolve => setTimeout(resolve, rollInterval));

            // Only update state if component is still in rolling phase
            if (currentPhase === 'rolling') {
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

            // Use extracted animation method
            await simulateDiceAnimation(teamsToUse, 2000);

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

            // Use extracted animation method while fetching
            await simulateDiceAnimation(teamsToUse, 2000);

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
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

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
        console.log('🔍 [DEBUG] applyDoubleDownEffects called:', {
            hasAppliedEffects,
            resultBoost: result.boost_percentage,
            affectedTeamsLength: result.affected_teams.length,
            isHost
        });
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
                    <div className="text-center text-white">
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        Loading double down data...
                    </div>
                );

            case 'showing_teams':
                return (
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
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
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                        <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <h3 className="text-2xl font-bold text-white mb-8">Rolling Dice...</h3>
                        <div className="animate-bounce">
                            <div className="flex gap-2 sm:gap-4 md:gap-6 justify-center mb-6">
                                <div
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice1_value || 1}/>
                                </div>
                                <div
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice2_value || 1}/>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'showing_results':
                return (
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                        <h2 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>
                        <h3 className="text-2xl font-bold text-white mb-4">Final Result:</h3>
                        <div className="flex gap-2 sm:gap-4 md:gap-6 justify-center mb-6">
                            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl border border-white/20">
                                <DiceIcon value={diceResult?.dice1_value || 1}/>
                            </div>
                            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl border border-white/20">
                                <DiceIcon value={diceResult?.dice2_value || 1}/>
                            </div>
                        </div>

                        {/* Special handling for each boost percentage */}
                        {diceResult?.boost_percentage === 0 && (
                            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-400 mb-6 animate-pulse">
                                NO BONUS!
                            </div>
                        )}
                        {diceResult?.boost_percentage === 25 && (
                            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-yellow-400 mb-6">
                                25% BONUS!
                            </div>
                        )}
                        {diceResult?.boost_percentage === 75 && (
                            <div
                                className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-400 mb-6 animate-pulse drop-shadow-lg">
                                75% BONUS!
                            </div>
                        )}
                        {diceResult?.boost_percentage === 100 && (
                            <div
                                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-green-400 mb-6 animate-bounce">
                                🎉 JACKPOT! 🎉
                                <div className="text-4xl sm:text-5xl md:text-6xl mt-2">100% BONUS!</div>
                            </div>
                        )}
                    </div>
                );

            case 'applying_effects':
                return (
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <div className="text-white text-lg">Applying effects...</div>
                    </div>
                );

            case 'complete':
                if (affectedTeams.length === 0) {
                    return (
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                            <div className="text-2xl text-gray-400">
                                No teams doubled down on this investment
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">DOUBLE DOWN</h1>
                        <h2 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {investmentName}
                        </h2>

                        {diceResult && (
                            <>
                                <div className="flex gap-2 sm:gap-4 md:gap-6 justify-center mb-6">
                                    <div
                                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-inner">
                                        <DiceIcon value={diceResult.dice1_value}/>
                                    </div>
                                    <div
                                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 md:p-6 shadow-inner">
                                        <DiceIcon value={diceResult.dice2_value}/>
                                    </div>
                                </div>

                                {/* Special handling for each boost percentage */}
                                {diceResult.boost_percentage === 0 && (
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-400 mb-6">
                                        NO BONUS!
                                    </div>
                                )}
                                {diceResult.boost_percentage === 25 && (
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-yellow-400 mb-6">
                                        25% BONUS!
                                    </div>
                                )}
                                {diceResult.boost_percentage === 75 && (
                                    <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-400 mb-6">
                                        75% BONUS!
                                    </div>
                                )}
                                {diceResult.boost_percentage === 100 && (
                                    <div
                                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-green-400 mb-6">
                                        🎉 JACKPOT! 🎉
                                        <div className="text-4xl sm:text-5xl md:text-6xl mt-2">100% BONUS!</div>
                                    </div>
                                )}

                                {diceResult.boost_percentage > 0 && (
                                    <div className="mb-6 bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-2xl">
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                                            <TrendingUp size={24}/>
                                            KPI Changes
                                        </h3>

                                        {/* ACTUAL KPI CHANGES DISPLAY */}
                                        {kpiChanges.length > 0 && (
                                            <div className="mb-4 text-center">
                                                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                                                    <div className="flex flex-col items-center gap-2">
                                                        {kpiChanges[0]?.changes.map((change, changeIndex) => (
                                                            <div key={changeIndex} className="text-lg font-bold">
                                                                {formatKpiChange(change)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <h4 className="text-lg font-bold text-white mb-2 text-center">
                                            Teams that doubled down are:
                                        </h4>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {affectedTeams.map((team, index) => (
                                                <div key={index}
                                                     className="bg-yellow-600/80 border border-yellow-400/60 rounded-lg px-4 py-2 shadow-lg">
                                                    <span className="text-lg font-medium text-white">{team}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{
                backgroundImage: `url("/images/craps-table-bg.webp")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#006D32' // Fallback color if image fails to load
            }}
        >
            <div className="max-w-sm sm:max-w-2xl md:max-w-4xl mx-auto px-4">
                {getPhaseDisplay()}
            </div>
        </div>
    );
};

export default DoubleDownDiceDisplay;
