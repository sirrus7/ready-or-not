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

            // Start showing random values (slowed down)
            intervalRef.current = setInterval(() => {
                setDisplayValue(Math.floor(Math.random() * 6) + 1);
            }, 200); // Slowed from 100ms to 200ms

            // After 2.5 seconds, settle to final value (increased duration)
            timeoutRef.current = setTimeout(() => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                setDisplayValue(value);
                setIsAnimating(false);
            }, 2500); // Increased from 1500ms to 2500ms

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
