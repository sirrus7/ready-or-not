// src/shared/components/DoubleDownDice/DoubleDownDiceDisplay.tsx
import React, {useState, useEffect} from 'react';
import {Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, TrendingUp} from 'lucide-react';
import {supabase} from '@shared/services/supabase';

interface DoubleDownDiceDisplayProps {
    sessionId: string;
    investmentId: string;
    investmentName: string;
    slideId: number;
}

interface DiceResult {
    investment_id: string;
    dice1_value: number;
    dice2_value: number;
    total_value: number;
    boost_percentage: number;
    affected_teams: string[];
}

// TWO DICE: Sum ranges from 2-12
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
};

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
    const [isRolling, setIsRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);

    useEffect(() => {
        // Check if dice has already been rolled for this investment
        checkExistingResult();

        // Subscribe to dice roll events
        const subscription = supabase
            .channel(`dice-roll-${sessionId}-${investmentId}`)
            .on('broadcast', {event: 'dice-rolled'}, ({payload}) => {
                if (payload.investment_id === investmentId) {
                    setDiceResult(payload);
                    setHasRolled(true);
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [sessionId, investmentId]);

    const checkExistingResult = async () => {
        const {data} = await supabase
            .from('double_down_results')
            .select('*')
            .eq('session_id', sessionId)
            .eq('investment_id', investmentId)
            .single();

        if (data) {
            setDiceResult({
                investment_id: data.investment_id,
                dice1_value: data.dice1_value,
                dice2_value: data.dice2_value,
                total_value: data.total_value,
                boost_percentage: data.boost_percentage,
                affected_teams: data.affected_teams
            });
            setHasRolled(true);
        }
    };

    const rollDice = async () => {
        if (hasRolled) return;

        setIsRolling(true);

        // Get teams that chose this investment for double down
        const { data: decisions } = await supabase
            .from('team_decisions')
            .select(`
                team_id,
                double_down_on_id,
                teams!inner(name)
              `)
            .eq('session_id', sessionId)
            .eq('double_down_on_id', investmentId);

        const affectedTeams = decisions?.map(d => d.teams?.name || 'Unknown Team') || [];

        if (affectedTeams.length === 0) {
            // No teams chose this investment
            setDiceResult({
                investment_id: investmentId,
                dice1_value: 0,
                dice2_value: 0,
                total_value: 0,
                boost_percentage: 0,
                affected_teams: []
            });
            setIsRolling(false);
            setHasRolled(true);
            return;
        }

        // Simulate dice roll animation
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
                affected_teams: affectedTeams
            });

            rollCount++;

            if (rollCount > 15) {
                clearInterval(rollInterval);

                // Final roll
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

                // Save to database
                saveResult(result);

                // Broadcast to other viewers
                supabase.channel(`dice-roll-${sessionId}-${investmentId}`).send({
                    type: 'broadcast',
                    event: 'dice-rolled',
                    payload: result
                });
            }
        }, 100);
    };

    const saveResult = async (result: DiceResult) => {
        await supabase.from('double_down_results').upsert({
            session_id: sessionId,
            investment_id: investmentId,
            dice1_value: result.dice1_value,
            dice2_value: result.dice2_value,
            total_value: result.total_value,
            boost_percentage: result.boost_percentage,
            affected_teams: result.affected_teams,
            created_at: new Date().toISOString()
        });
    };

    const getBoostColor = (boost: number) => {
        if (boost === 100) return 'text-green-400';
        if (boost === 75) return 'text-blue-400';
        if (boost === 25) return 'text-yellow-400';
        return 'text-gray-400';
    };

    // No teams selected this investment
    if (diceResult && diceResult.affected_teams.length === 0) {
        return (
            <div
                className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-8">
                <div
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-gray-700 max-w-4xl w-full">
                    <h2 className="text-4xl font-bold text-gray-400 mb-4">{investmentName}</h2>
                    <div className="text-2xl text-gray-500 text-center">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-600"/>
                        No teams doubled down on this investment
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            <div
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-slate-700 max-w-4xl w-full">
                {/* Investment Name */}
                <h2 className="text-5xl font-bold text-white mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {investmentName}
                </h2>

                {/* Dice Display */}
                <div className="flex flex-col items-center mb-8">
                    {!hasRolled && !isRolling ? (
                        <button
                            onClick={rollDice}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6 px-12 rounded-xl text-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            Roll the Dice!
                        </button>
                    ) : (
                        <div className={`transition-all duration-300 ${isRolling ? 'animate-bounce' : ''}`}>
                            <div className="flex gap-4 justify-center mb-6">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice1_value || 1}/>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-inner">
                                    <DiceIcon value={diceResult?.dice2_value || 1}/>
                                </div>
                            </div>
                            {diceResult && hasRolled && (
                                <div className="text-center">
                                    <div className="text-6xl font-bold text-white mb-2">
                                        {diceResult.total_value}
                                    </div>
                                    <div className={`text-4xl font-bold ${getBoostColor(diceResult.boost_percentage)}`}>
                                        {diceResult.boost_percentage}% Boost
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Affected Teams */}
                {diceResult && diceResult.affected_teams.length > 0 && hasRolled && (
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
                )}
            </div>
        </div>
    );
};

export default DoubleDownDiceDisplay;
