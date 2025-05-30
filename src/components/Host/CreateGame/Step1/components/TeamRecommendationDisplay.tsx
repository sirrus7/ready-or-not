// src/components/Host/CreateGame/Step1/components/TeamRecommendationDisplay.tsx - Recommendation UI
import React from 'react';

interface TeamRecommendationDisplayProps {
    recommendation: string;
    isVisible: boolean;
}

const TeamRecommendationDisplay: React.FC<TeamRecommendationDisplayProps> = ({
                                                                                 recommendation,
                                                                                 isVisible
                                                                             }) => {
    if (!isVisible || !recommendation) {
        return null;
    }

    const isError = recommendation.includes("Custom team distribution required") ||
        recommendation.includes("Enter number of players") ||
        recommendation.includes("Please enter a valid number");

    return (
        <div className={`p-3 rounded-md text-sm mt-2 ${
            isError
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
            {recommendation}
        </div>
    );
};

export default TeamRecommendationDisplay;
