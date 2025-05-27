// src/components/TeacherHost/MonitorSelector.tsx
import React, { useState, useEffect } from 'react';
import { Monitor, Check, AlertCircle, Projector, Laptop } from 'lucide-react';
import { MonitorInfo, getDisplays, supportsWindowManagement } from '../../utils/displayUtils';

interface MonitorSelectorProps {
    onSelect: (monitor: MonitorInfo) => void;
    currentSessionId: string;
}

const MonitorSelector: React.FC<MonitorSelectorProps> = ({ onSelect, currentSessionId }) => {
    const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonitor, setSelectedMonitor] = useState<MonitorInfo | null>(null);

    useEffect(() => {
        detectMonitors();
    }, []);

    const detectMonitors = async () => {
        setLoading(true);
        setError(null);

        try {
            const detectedMonitors = await getDisplays();
            setMonitors(detectedMonitors);

            // Pre-select external monitor if available
            const externalMonitor = detectedMonitors.find(m => !m.isInternal && !m.isPrimary);
            if (externalMonitor) {
                setSelectedMonitor(externalMonitor);
            } else if (detectedMonitors.length > 1) {
                // Select non-primary if no external found
                setSelectedMonitor(detectedMonitors.find(m => !m.isPrimary) || detectedMonitors[1]);
            }
        } catch (err) {
            setError('Failed to detect monitors. Please ensure you have granted display permissions.');
            console.error('Monitor detection error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMonitorSelect = (monitor: MonitorInfo) => {
        setSelectedMonitor(monitor);
    };

    const handleConfirm = () => {
        if (selectedMonitor) {
            onSelect(selectedMonitor);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Detecting displays...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                        <AlertCircle className="text-red-500 mt-0.5 mr-2" size={20} />
                        <div>
                            <p className="text-red-800 font-medium">Display Detection Error</p>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onSelect(monitors[0] || {
                        id: 0,
                        label: 'Default Display',
                        isPrimary: true,
                        isInternal: false,
                        width: 1920,
                        height: 1080,
                        left: 0,
                        top: 0
                    })}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Continue with Default Display
                </button>
            </div>
        );
    }

    const renderMonitorVisual = () => {
        if (!supportsWindowManagement() || monitors.length === 1) {
            return (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Monitor size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-4">
                        Multiple display detection is not supported in your browser.
                    </p>
                    <p className="text-sm text-gray-500">
                        The student display will open in a new window. You can manually drag it to your projector display.
                    </p>
                </div>
            );
        }

        // Calculate scale for visual representation
        const maxWidth = 400;
        const maxHeight = 200;
        const allLefts = monitors.map(m => m.left);
        const allTops = monitors.map(m => m.top);
        const minLeft = Math.min(...allLefts);
        const minTop = Math.min(...allTops);
        const maxRight = Math.max(...monitors.map(m => m.left + m.width));
        const maxBottom = Math.max(...monitors.map(m => m.top + m.height));

        const totalWidth = maxRight - minLeft;
        const totalHeight = maxBottom - minTop;
        const scale = Math.min(maxWidth / totalWidth, maxHeight / totalHeight) * 0.8;

        return (
            <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-4 text-center">
                    Click to select the display for student view (usually your projector or TV)
                </p>

                <div
                    className="relative mx-auto"
                    style={{
                        width: `${totalWidth * scale}px`,
                        height: `${totalHeight * scale}px`
                    }}
                >
                    {monitors.map((monitor) => {
                        const isSelected = selectedMonitor?.id === monitor.id;
                        const relativeLeft = (monitor.left - minLeft) * scale;
                        const relativeTop = (monitor.top - minTop) * scale;

                        return (
                            <button
                                key={monitor.id}
                                onClick={() => handleMonitorSelect(monitor)}
                                className={`
                  absolute border-2 rounded-lg p-4 transition-all
                  ${isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                                }
                `}
                                style={{
                                    left: `${relativeLeft}px`,
                                    top: `${relativeTop}px`,
                                    width: `${monitor.width * scale}px`,
                                    height: `${monitor.height * scale}px`,
                                }}
                            >
                                <div className="flex flex-col items-center justify-center h-full">
                                    {monitor.isInternal ? (
                                        <Laptop size={24} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                                    ) : (
                                        <Projector size={24} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                                    )}
                                    <span className={`text-xs mt-2 font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {monitor.label}
                  </span>
                                    <span className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                    {monitor.width}×{monitor.height}
                  </span>
                                    {monitor.isPrimary && (
                                        <span className="text-xs text-gray-400 mt-1">(Primary)</span>
                                    )}
                                    {isSelected && (
                                        <Check size={16} className="text-blue-600 mt-1" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {selectedMonitor
                            ? `Selected: ${selectedMonitor.label}`
                            : 'Please select a display'}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Select Student Display</h3>

            {renderMonitorVisual()}

            <div className="mt-6 flex gap-3 justify-end">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedMonitor}
                    className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${selectedMonitor
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
          `}
                >
                    Launch Student Display
                </button>
            </div>

            {!supportsWindowManagement() && (
                <p className="text-xs text-gray-500 text-center mt-4">
                    Tip: For better multi-monitor support, use Chrome or Edge browser
                </p>
            )}
        </div>
    );
};

export default MonitorSelector;