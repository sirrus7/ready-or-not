// src/core/game/DoubleDownEffectsProcessor.ts
import {supabase} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';

export class DoubleDownEffectsProcessor {
    static async processDoubleDownResults(sessionId: string) {
        console.log('[DoubleDownEffectsProcessor] Processing double down results...');

        // Get all double down results for this session
        const {data: results} = await supabase
            .from('double_down_results')
            .select('*')
            .eq('session_id', sessionId);

        if (!results || results.length === 0) {
            console.log('[DoubleDownEffectsProcessor] No double down results found');
            return;
        }

        // Get all teams and their double down choices
        const { data: decisions } = await supabase
            .from('team_decisions')
            .select(`
                team_id,
                double_down_on_id,
                teams!inner(name)
              `)
            .eq('session_id', sessionId)
            .not('double_down_on_id', 'is', null);

        if (!decisions) return;

        // Process each team's double down
        for (const decision of decisions) {
            const result = results.find(r =>
                r.investment_id === decision.double_down_on_id
            );

            if (!result) continue;

            // Calculate multiplier from boost percentage
            const multiplier = 1 + (result.boost_percentage / 100);

            // Apply the multiplier to the investment's payoff effects
            await this.applyMultiplierToTeam(
                sessionId,
                decision.team_id,
                decision.double_down_on_id,
                multiplier,
                result.boost_percentage
            );

            console.log(`[DoubleDownEffectsProcessor] Applied ${result.boost_percentage}% boost to team ${decision.teams.name} for investment ${decision.double_down_on_id}`);
        }
    }

    private static async applyMultiplierToTeam(
        sessionId: string,
        teamId: string,
        investmentOptionId: string,
        multiplier: number,
        boostPercentage: number
    ) {
        // Get the base payoff effects for this investment from RD3 payoffs
        const rd3Payoffs = allInvestmentPayoffsData['rd3-payoff'] || [];
        const payoffForOption = rd3Payoffs.find(p => p.id === investmentOptionId);

        if (!payoffForOption?.effects) {
            console.warn(`[DoubleDownEffectsProcessor] No payoff effects found for investment ${investmentOptionId}`);
            return;
        }

        // Apply multiplier to each effect
        const multipliedEffects = payoffForOption.effects.map(effect => ({
            ...effect,
            change_value: Math.round(effect.change_value * multiplier),
            description: `${effect.description || ''} (+${boostPercentage}% Double Down Bonus)`
        }));

        // Get current team KPIs
        const {data: currentKpis} = await supabase
            .from('team_round_data')
            .select('*')
            .eq('session_id', sessionId)
            .eq('team_id', teamId)
            .eq('round_number', 3)
            .single();

        if (!currentKpis) {
            console.error(`[DoubleDownEffectsProcessor] No KPI data found for team ${teamId}`);
            return;
        }

        // Apply the multiplied effects
        const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, multipliedEffects);
        const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

        // Save to database
        await db.kpis.update(currentKpis.id, {
            ...updatedKpis,
            ...finalKpis
        });

        console.log(`[DoubleDownEffectsProcessor] Successfully applied ${boostPercentage}% boost to team ${teamId}`);
    }
}
