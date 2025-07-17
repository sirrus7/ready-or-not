// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect, useRef} from 'react';
import {DoubleDownEffectsProcessor, KpiChangeDetail} from '@core/game/DoubleDownEffectsProcessor';
import {SimpleRealtimeManager} from '@core/sync/SimpleRealtimeManager';
import {db} from '@shared/services/supabase';
import {DoubleDownDecision, DoubleDownResult, InvestmentPayoff, KpiChange, Slide, TeamRoundData} from "@shared/types";
import {formatCurrency, formatNumber} from "@shared/utils/formatUtils";
import {DoubleDownAudioManager} from '@shared/utils/audio';
import Dice3D from "./Dice3D";
import {allInvestmentPayoffsData} from "@core/content/InvestmentPayoffContent";

type DiceResult = Omit<DoubleDownResult, 'id' | 'created_at' | 'session_id' | 'capacity_change' | 'orders_change' | 'asp_change' | 'cost_change'>;
type KpiChanges = Pick<DoubleDownResult, 'capacity_change' | 'orders_change' | 'asp_change' | 'cost_change'>;

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

const DoubleDownDiceDisplay: React.FC<DoubleDownDiceDisplayProps> = ({
                                                                         sessionId,
                                                                         investmentId,
                                                                         investmentName,
                                                                         slideId,
                                                                         isHost = false
                                                                     }: DoubleDownDiceDisplayProps) => {
    const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
    const [kpiChanges, setKpiChanges] = useState<KpiChange[]>([]);
    const [hasRolled, setHasRolled] = useState(false);
    const [hasAppliedEffects, setHasAppliedEffects] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<'loading' | 'rolling' | 'showing_results' | 'complete'>('loading');
    const [affectedTeams, setAffectedTeams] = useState<string[]>([]);
    const [isRolling, setIsRolling] = useState(false);
    const processingRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioManager: DoubleDownAudioManager = DoubleDownAudioManager.getInstance();

    useEffect((): () => void => {
        initializeDoubleDownRoll();

        return (): void => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            audioManager.cleanupAudio(investmentId);
        };
    }, [slideId, investmentId, sessionId]);

    const waitForHostResult = async (teamNames: string[]) => {
        setCurrentPhase('rolling');
        setIsRolling(true); // Start CSS animation instead of setInterval

        // Poll for host result without constant visual updates
        let attempts: number = 0;
        const maxAttempts: number = 20;

        while (attempts < maxAttempts && !hasRolled) {
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (existingResult) {
                setIsRolling(false); // Stop animation

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

                // Presentation mode: no audio, just apply effects
                if (finalResult) {
                    await applyEffectsAsPresentation(finalResult);
                    setHasAppliedEffects(true);
                    setCurrentPhase('complete');
                }

                return;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        setIsRolling(false); // Stop animation on timeout
        console.error('[DoubleDownDiceDisplay] PRESENTATION: Timeout waiting for host result');
        setCurrentPhase('complete');
    };

    const initializeDoubleDownRoll: () => Promise<void> = async (): Promise<void> => {
        // CRITICAL: Prevent multiple simultaneous executions
        if (processingRef.current) {
            return;
        }

        processingRef.current = true;
        setCurrentPhase('loading');

        try {
            // Check for existing result FIRST (your existing code)
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);
            if (existingResult) {
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
                        investmentId
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

            // Go straight to rolling if teams exist
            await audioManager.loadIntroAudio(investmentId);
            setCurrentPhase('rolling');

            if (isHost) {
                rollDice(teamNames);
            } else {
                waitForHostResult(teamNames);
            }

        } catch (error) {
            console.error('Error initializing double down roll:', error);
            setCurrentPhase('complete');
        } finally {
            // Always clear the processing lock
            processingRef.current = false;
        }
    };

    const simulateDiceAnimation = async (duration: number = 2000): Promise<void> => {
        // Start CSS animation instead of state updates
        setIsRolling(true);

        // Wait for animation duration without constant state updates
        await new Promise(resolve => setTimeout(resolve, duration));

        // Stop animation
        setIsRolling(false);
    };

    const rollDice = async (teams?: string[]) => {
        // Use parameter if provided, otherwise fall back to state
        const teamsToUse: string[] = teams || affectedTeams;

        if (hasRolled || teamsToUse.length === 0) {
            return;
        }

        setCurrentPhase('rolling');

        let finalDice1: number;
        let finalDice2: number;
        let finalTotal: number;
        let finalBoost: number;

        if (isHost) {
            // HOST: Generate random dice results
            // Use extracted animation method
            await simulateDiceAnimation(2000);

            // Generate final dice result
            finalDice1 = Math.floor(Math.random() * 6) + 1;
            finalDice2 = Math.floor(Math.random() * 6) + 1;
            finalTotal = finalDice1 + finalDice2;
            finalBoost = DICE_BOOSTS[finalTotal as keyof typeof DICE_BOOSTS];
        } else {
            // PRESENTATION: Fetch results from database
            // Use extracted animation method while fetching
            await simulateDiceAnimation(2000);

            // Fetch results from database (retry until available)
            let existingResult = null;
            let attempts = 0;
            const maxAttempts = 10;

            while (!existingResult && attempts < maxAttempts) {
                existingResult = await db.doubleDown.getResultForInvestment(sessionId, investmentId);
                if (!existingResult) {
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
        // Play intro audio during rolling
        await audioManager.playIntroAudio(investmentId);

        setCurrentPhase('showing_results');

        // Only save if host
        if (isHost) {
            await saveResult(result);
        }

        // Immediately play result audio and apply effects
        await audioManager.playResultAudio(investmentId, result.total_value);
        await applyDoubleDownEffects(result);
    };

    const calculateFinalKpiChanges = (boostPercentage: number): KpiChanges => {
        if (boostPercentage === 0) {
            return {
                capacity_change: 0,
                orders_change: 0,
                asp_change: 0,
                cost_change: 0
            };
        }

        // Get the original investment payoffs
        const rd3Payoffs: InvestmentPayoff[] = allInvestmentPayoffsData['rd3-payoff'] || [];
        const payoffForOption: InvestmentPayoff | undefined = rd3Payoffs.find(p => p.id === investmentId);

        if (!payoffForOption?.effects) {
            return {
                capacity_change: 0,
                orders_change: 0,
                asp_change: 0,
                cost_change: 0
            };
        }

        // Apply boost percentage as ADDITIONAL bonus
        const boostMultiplier: number = boostPercentage / 100;
        let capacityChange: number = 0;
        let ordersChange: number = 0;
        let aspChange: number = 0;
        let costChange: number = 0;

        // Find and boost the relevant KPI effects
        payoffForOption.effects.forEach(effect => {
            const boostedValue = effect.change_value * boostMultiplier;

            switch (effect.kpi) {
                case 'capacity':
                    capacityChange = Math.ceil(Math.abs(boostedValue) / 250) * 250 * Math.sign(boostedValue);
                    break;
                case 'orders':
                    ordersChange = Math.ceil(Math.abs(boostedValue) / 250) * 250 * Math.sign(boostedValue);
                    break;
                case 'asp':
                    aspChange = Math.ceil(Math.abs(boostedValue) / 10) * 10 * Math.sign(boostedValue);
                    break;
                case 'cost':
                    costChange = Math.ceil(Math.abs(boostedValue) / 25000) * 25000 * Math.sign(boostedValue);
                    break;
            }
        });

        return {
            capacity_change: capacityChange,
            orders_change: ordersChange,
            asp_change: aspChange,
            cost_change: costChange
        };
    };

    const saveResult = async (result: DiceResult) => {
        try {
            // Check if result already exists before saving
            const existingResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (existingResult) {
                return;
            }

            // Calculate final KPI changes once with proper rounding
            const kpiChanges: KpiChanges = calculateFinalKpiChanges(result.boost_percentage);

            await db.doubleDown.saveResult({
                session_id: sessionId,
                investment_id: investmentId,
                dice1_value: result.dice1_value,
                dice2_value: result.dice2_value,
                total_value: result.total_value,
                boost_percentage: result.boost_percentage,
                affected_teams: result.affected_teams,
                capacity_change: kpiChanges.capacity_change,
                orders_change: kpiChanges.orders_change,
                asp_change: kpiChanges.asp_change,
                cost_change: kpiChanges.cost_change
            });
        } catch (error) {
            console.error('Error saving dice result:', error);
        }
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
    };

    const applyEffectsAsHost = async (result: DiceResult) => {
        // Get team data and before values
        const teamDecisions: DoubleDownDecision[] = await db.decisions.getTeamsDoubledDownOnInvestment(sessionId, investmentId);

        // Apply effects to database
        await DoubleDownEffectsProcessor.processDoubleDownForInvestment(
            sessionId,
            investmentId,
            result.boost_percentage
        );

        // HOST DISPLAY: Use stored KPI changes (same as presentation)
        const displayChanges = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
            sessionId,
            investmentId
        );

        const formattedChanges: KpiChange[] = result.affected_teams.map(teamName => ({
            team_name: teamName,
            changes: displayChanges
        }));

        setKpiChanges(formattedChanges);

        // Still broadcast the actual database changes to teams
        const updatedKpis: Record<string, TeamRoundData | null> = await getUpdatedKpisForBroadcast(teamDecisions);
        await broadcastKpiUpdatesToTeams(updatedKpis, result);
    };

    const applyEffectsAsPresentation = async (result: DiceResult) => {
        const displayChanges: KpiChangeDetail[] = await DoubleDownEffectsProcessor.getKpiChangesForDisplay(
            sessionId,
            investmentId
        );

        const formattedChanges: KpiChange[] = result.affected_teams.map(teamName => ({
            team_name: teamName,
            changes: displayChanges
        }));

        setKpiChanges(formattedChanges);
    };

    const applyDoubleDownEffects = async (result: DiceResult) => {
        if (hasAppliedEffects || result.affected_teams.length === 0) {
            return;
        }

        try {
            if (isHost) {
                await applyEffectsAsHost(result);
            } else {
                await applyEffectsAsPresentation(result);
            }
            setHasAppliedEffects(true);
        } catch (error) {
            console.error('[DoubleDownDiceDisplay] Error applying double down effects:', error);
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
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div
                            className="bg-black/70 backdrop-blur-md rounded-2xl p-8 border border-game-orange-400/30 shadow-2xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-wider text-center">DOUBLE
                                DOWN</h1>
                            <div
                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                            <div className="text-white/80 md:text-lg lg:text-xl xl:text-2xl text-center">Loading double
                                down data...
                            </div>
                        </div>
                    </div>
                );

            case 'rolling':
                return (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div
                            className="bg-black/70 backdrop-blur-md rounded-2xl p-8 border border-game-orange-400/30 shadow-2xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-wider text-center">DOUBLE
                                DOWN</h1>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-game-orange-300 mb-6 text-center">
                                {investmentName}
                            </h2>
                            <div className="flex justify-center gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-8">
                                <Dice3D value={diceResult?.dice1_value || 1} isRolling={isRolling}/>
                                <Dice3D value={diceResult?.dice2_value || 1} isRolling={isRolling}/>
                            </div>
                            <div className="text-white/80 md:text-lg lg:text-xl xl:text-2xl text-center animate-pulse">
                                Rolling the dice...
                            </div>
                        </div>
                    </div>
                );

            case 'showing_results':
                return (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div
                            className="bg-black/70 backdrop-blur-md rounded-2xl p-8 border border-game-orange-400/30 shadow-2xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-wider text-center">DOUBLE
                                DOWN</h1>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-game-orange-300 mb-6 text-center">
                                {investmentName}
                            </h2>
                            <div className="flex justify-center gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-8">
                                <Dice3D value={diceResult?.dice1_value || 1} isRolling={false}/>
                                <Dice3D value={diceResult?.dice2_value || 1} isRolling={false}/>
                            </div>
                            <div className="text-center mb-6">
                                {diceResult?.boost_percentage === 0 && (
                                    <div
                                        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-red-400">
                                        NO BONUS
                                    </div>
                                )}
                                {diceResult?.boost_percentage === 25 && (
                                    <div
                                        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-yellow-400">
                                        25% BONUS!
                                    </div>
                                )}
                                {diceResult?.boost_percentage === 75 && (
                                    <div
                                        className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-yellow-400 animate-pulse">
                                        75% BONUS!
                                    </div>
                                )}
                                {diceResult?.boost_percentage === 100 && (
                                    <div
                                        className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-green-400 animate-bounce">
                                        JACKPOT!
                                        <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl mt-2">100%
                                            BONUS!</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'complete':
                if (affectedTeams.length === 0) {
                    return (
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div
                                className="bg-black/70 backdrop-blur-md rounded-2xl p-8 border border-game-orange-400/30 shadow-2xl">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-wider text-center">DOUBLE
                                    DOWN</h1>
                                <div className="text-xl md:text-2xl lg:text-3xl xl:text-4xl text-white/80 text-center">
                                    No teams doubled down on {investmentName}
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div
                            className="bg-black/70 backdrop-blur-md rounded-2xl p-8 border border-game-orange-400/30 shadow-2xl max-w-4xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-wider text-center">DOUBLE
                                DOWN</h1>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-game-orange-300 mb-6 text-center">
                                {investmentName}
                            </h2>
                            {diceResult && (
                                <>
                                    <div className="flex justify-center gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-8">
                                        <Dice3D value={diceResult.dice1_value} isRolling={false}/>
                                        <Dice3D value={diceResult.dice2_value} isRolling={false}/>
                                    </div>
                                    <div className="text-center mb-8">
                                        {diceResult.boost_percentage === 0 && (
                                            <div
                                                className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-red-400">
                                                NO BONUS
                                            </div>
                                        )}
                                        {diceResult.boost_percentage === 25 && (
                                            <div
                                                className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-yellow-400">
                                                25% BONUS!
                                            </div>
                                        )}
                                        {diceResult.boost_percentage === 75 && (
                                            <div
                                                className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-yellow-400">
                                                75% BONUS!
                                            </div>
                                        )}
                                        {diceResult.boost_percentage === 100 && (
                                            <div
                                                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-green-400">
                                                JACKPOT!
                                                <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl mt-2">100%
                                                    BONUS!</div>
                                            </div>
                                        )}
                                    </div>
                                    {kpiChanges.length > 0 && (
                                        <div className="bg-black/50 rounded-xl p-6 mb-8">
                                            <h3 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-4 text-center">KPI
                                                Changes</h3>
                                            <div className="grid gap-4">
                                                {kpiChanges.map((teamChange, teamIndex) => (
                                                    <div key={teamIndex} className="text-center">
                                                        <div className="flex flex-wrap gap-2 justify-center">
                                                            {teamChange.changes.map((change, changeIndex) => (
                                                                <span key={changeIndex}
                                                                      className="text-base md:text-lg lg:text-xl xl:text-2xl">
                                                                {formatKpiChange(change)}
                                                            </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {affectedTeams.length > 0 && (
                                        <div className="bg-black/50 rounded-xl p-6">
                                            <h3 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-white mb-4 text-center">
                                                Teams that doubled down:
                                            </h3>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {affectedTeams.map((team, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-game-orange-500 text-white px-3 py-1 rounded-full text-sm md:text-base lg:text-lg xl:text-xl font-medium"
                                                    >
                                                        <span className="text-white font-medium">{team}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
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
    )
        ;
};

export default DoubleDownDiceDisplay;
