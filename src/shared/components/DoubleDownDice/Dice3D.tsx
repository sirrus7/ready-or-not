// src/shared/components/DoubleDownDice/Dice3D.tsx
import React, {useEffect, useState, useRef} from 'react';

interface Dice3DProps {
    value: number;
    isRolling: boolean;
}

const Dice3D: React.FC<Dice3DProps> = ({value, isRolling}) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRolling && !isAnimating) {
            setIsAnimating(true);

            // Animation phases with decreasing speed
            const phases = [
                {duration: 1000, interval: 100},  // Fast rolling for 1 second
                {duration: 800, interval: 150},   // Medium rolling for 0.8 seconds
                {duration: 600, interval: 200},   // Slow rolling for 0.6 seconds
                {duration: 400, interval: 300},   // Very slow rolling for 0.4 seconds
                {duration: 200, interval: 400}    // Final slow roll for 0.2 seconds
            ];

            let currentPhase = 0;
            let startTime = Date.now();

            const animatePhase = () => {
                if (currentPhase >= phases.length) {
                    // Animation complete, settle on final value
                    setDisplayValue(value);
                    setIsAnimating(false);
                    return;
                }

                const phase = phases[currentPhase];
                const elapsedTime = Date.now() - startTime;

                if (elapsedTime >= phase.duration) {
                    // Move to next phase
                    currentPhase++;
                    startTime = Date.now();

                    // Clear current interval
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }

                    // Start next phase
                    animatePhase();
                    return;
                }

                // Set interval for current phase
                intervalRef.current = setInterval(() => {
                    // As we get closer to the end, bias towards the target value
                    const totalPhases = phases.length;
                    const progressThroughPhases = currentPhase / totalPhases;

                    if (progressThroughPhases > 0.6 && Math.random() < 0.3) {
                        // 30% chance to show target value in later phases
                        setDisplayValue(value);
                    } else if (progressThroughPhases > 0.8 && Math.random() < 0.5) {
                        // 50% chance to show target value in final phases
                        setDisplayValue(value);
                    } else {
                        // Show random value, but bias towards target in later phases
                        let randomValue = Math.floor(Math.random() * 6) + 1;

                        // In final phases, occasionally show adjacent values to target
                        if (progressThroughPhases > 0.7 && Math.random() < 0.4) {
                            const adjacent = [
                                Math.max(1, value - 1),
                                value,
                                Math.min(6, value + 1)
                            ];
                            randomValue = adjacent[Math.floor(Math.random() * adjacent.length)];
                        }

                        setDisplayValue(randomValue);
                    }
                }, phase.interval);

                // Set timeout for phase duration
                timeoutRef.current = setTimeout(() => {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }
                    animatePhase();
                }, phase.duration);
            };

            // Start the animation
            animatePhase();

        } else if (!isRolling) {
            // Clean up and show final value
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setDisplayValue(value);
            setIsAnimating(false);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isRolling, value]);

    const renderDots = (num: number) => {
        const dotStyle = "absolute w-3 h-3 bg-white rounded-full shadow-lg";

        switch (num) {
            case 1:
                return <div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}/>;

            case 2:
                return (
                    <>
                        <div className={`${dotStyle} top-2 left-2`}/>
                        <div className={`${dotStyle} bottom-2 right-2`}/>
                    </>
                );

            case 3:
                return (
                    <>
                        <div className={`${dotStyle} top-2 left-2`}/>
                        <div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}/>
                        <div className={`${dotStyle} bottom-2 right-2`}/>
                    </>
                );

            case 4:
                return (
                    <>
                        <div className={`${dotStyle} top-2 left-2`}/>
                        <div className={`${dotStyle} top-2 right-2`}/>
                        <div className={`${dotStyle} bottom-2 left-2`}/>
                        <div className={`${dotStyle} bottom-2 right-2`}/>
                    </>
                );

            case 5:
                return (
                    <>
                        <div className={`${dotStyle} top-2 left-2`}/>
                        <div className={`${dotStyle} top-2 right-2`}/>
                        <div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}/>
                        <div className={`${dotStyle} bottom-2 left-2`}/>
                        <div className={`${dotStyle} bottom-2 right-2`}/>
                    </>
                );

            case 6:
                return (
                    <>
                        <div className={`${dotStyle} top-2 left-2`}/>
                        <div className={`${dotStyle} top-1/2 left-2 transform -translate-y-1/2`}/>
                        <div className={`${dotStyle} bottom-2 left-2`}/>
                        <div className={`${dotStyle} top-2 right-2`}/>
                        <div className={`${dotStyle} top-1/2 right-2 transform -translate-y-1/2`}/>
                        <div className={`${dotStyle} bottom-2 right-2`}/>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="dice-container">
            <div className={`dice-3d ${isAnimating ? 'rolling' : ''}`}>
                <div className="dice-face front">
                    <div className="relative w-full h-full">
                        {renderDots(3)}
                    </div>
                </div>
                <div className="dice-face back">
                    <div className="relative w-full h-full">
                        {renderDots(4)}
                    </div>
                </div>
                <div className="dice-face right">
                    <div className="relative w-full h-full">
                        {renderDots(2)}
                    </div>
                </div>
                <div className="dice-face left">
                    <div className="relative w-full h-full">
                        {renderDots(5)}
                    </div>
                </div>
                <div className="dice-face top">
                    <div className="relative w-full h-full">
                        {renderDots(displayValue)}
                    </div>
                </div>
                <div className="dice-face bottom">
                    <div className="relative w-full h-full">
                        {renderDots(7 - displayValue)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dice3D;
