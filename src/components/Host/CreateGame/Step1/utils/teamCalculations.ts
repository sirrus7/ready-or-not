// src/components/Host/CreateGame/Step1/utils/teamCalculations.ts - Pure calculation functions
export interface TeamRecommendationResult {
    teams: number;
    recommendationText: string;
}

export const calculateTeamRecommendation = (players: number): TeamRecommendationResult => {
    if (players <= 0) {
        return { teams: 0, recommendationText: "Enter number of players." };
    }

    // Custom team distribution based on player count
    const recommendations: Record<number, TeamRecommendationResult> = {
        1: { teams: 0, recommendationText: "Custom team distribution required." },
        2: { teams: 0, recommendationText: "Custom team distribution required." },
        3: { teams: 0, recommendationText: "Custom team distribution required." },
        4: { teams: 1, recommendationText: "Custom team distribution required." },
        5: { teams: 1, recommendationText: "Custom team distribution required." },
        6: { teams: 1, recommendationText: "Custom team distribution required." },
        7: { teams: 1, recommendationText: "Custom team distribution required." },
        8: { teams: 2, recommendationText: "Custom team distribution required." },
        9: { teams: 2, recommendationText: "Custom team distribution required." },
        10: { teams: 2, recommendationText: "We recommend 2 Teams: Two 5-Player Teams." },
        11: { teams: 2, recommendationText: "We recommend 2 Teams: One 5-Player Team & One 6-Player Team." },
        12: { teams: 2, recommendationText: "We recommend 2 Teams: Two 6-Player Teams." },
        13: { teams: 3, recommendationText: "We recommend 3 Teams: Two 4-Player Teams & One 5-Player Team." },
        14: { teams: 3, recommendationText: "We recommend 3 Teams: Two 5-Player Teams & One 4-Player Team." },
        15: { teams: 3, recommendationText: "We recommend 3 Teams: Three 5-Player Teams." },
        16: { teams: 4, recommendationText: "We recommend 4 Teams: Four 4-Player Teams." },
        17: { teams: 4, recommendationText: "We recommend 4 Teams: Three 4-Player Teams & One 5-Player Team." },
        18: { teams: 4, recommendationText: "We recommend 4 Teams: Two 4-Player Teams & Two 5-Player Teams." },
        19: { teams: 4, recommendationText: "We recommend 4 Teams: One 4-Player Team & Three 5-Player Teams." },
        20: { teams: 4, recommendationText: "We recommend 4 Teams: Four 5-Player Teams." },
        21: { teams: 5, recommendationText: "We recommend 5 Teams: One 4-Player Team & Four 5-Player Teams." },
        22: { teams: 5, recommendationText: "We recommend 5 Teams: Two 4-Player Teams & Three 5-Player Teams." },
        23: { teams: 5, recommendationText: "We recommend 5 Teams: Three 4-Player Teams & Two 5-Player Teams." },
        24: { teams: 5, recommendationText: "We recommend 5 Teams: Four 4-Player Teams & One 5-Player Team." },
        25: { teams: 5, recommendationText: "We recommend 5 Teams: Five 5-Player Teams." },
        26: { teams: 6, recommendationText: "We recommend 6 Teams: Two 4-Player Teams & Four 5-Player Teams." },
        27: { teams: 6, recommendationText: "We recommend 6 Teams: Three 4-Player Teams & Three 5-Player Teams." },
        28: { teams: 6, recommendationText: "We recommend 6 Teams: Four 4-Player Teams & Two 5-Player Teams." },
        29: { teams: 6, recommendationText: "We recommend 6 Teams: Five 4-Player Teams & One 5-Player Team." },
        30: { teams: 6, recommendationText: "We recommend 6 Teams: Six 5-Player Teams." },
        31: { teams: 7, recommendationText: "We recommend 7 Teams: Three 4-Player Teams & Four 5-Player Teams." },
        32: { teams: 7, recommendationText: "We recommend 7 Teams: Four 4-Player Teams & Three 5-Player Teams." },
        33: { teams: 7, recommendationText: "We recommend 7 Teams: Five 4-Player Teams & Two 5-Player Teams." },
        34: { teams: 7, recommendationText: "We recommend 7 Teams: Six 4-Player Teams & One 5-Player Team." },
        35: { teams: 7, recommendationText: "We recommend 7 Teams: Seven 5-Player Teams." },
        36: { teams: 8, recommendationText: "We recommend 8 Teams: Four 4-Player Teams & Four 5-Player Teams." },
        37: { teams: 8, recommendationText: "We recommend 8 Teams: Five 4-Player Teams & Three 5-Player Teams." },
        38: { teams: 8, recommendationText: "We recommend 8 Teams: Six 4-Player Teams & Two 5-Player Teams." },
        39: { teams: 8, recommendationText: "We recommend 8 Teams: Seven 4-Player Teams & One 5-Player Team." },
        40: { teams: 8, recommendationText: "We recommend 8 Teams: Eight 5-Player Teams." }
    };

    // Return specific recommendation if available
    if (recommendations[players]) {
        return recommendations[players];
    }

    // For larger groups, use algorithm
    if (players > 40) {
        return calculateLargeGroupRecommendation(players);
    }

    return { teams: 1, recommendationText: "Please enter a valid number of players (1-40+)." };
};

const calculateLargeGroupRecommendation = (players: number): TeamRecommendationResult => {
    // Aim for 4-5 players per team
    const idealTeams = Math.round(players / 4.5);
    const basePlayersPerTeam = Math.floor(players / idealTeams);
    const remainder = players % idealTeams;

    // Calculate distribution
    const largerTeams = remainder;
    const smallerTeams = idealTeams - remainder;

    let recommendationText = `We recommend ${idealTeams} Teams: `;
    if (remainder === 0) {
        recommendationText += `${idealTeams} Teams of ${basePlayersPerTeam} players each.`;
    } else {
        recommendationText += `${smallerTeams} Teams of ${basePlayersPerTeam} players & ${largerTeams} Teams of ${basePlayersPerTeam + 1} players.`;
    }

    return {
        teams: idealTeams,
        recommendationText: recommendationText
    };
};
