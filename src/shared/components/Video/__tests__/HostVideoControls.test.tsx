import { render, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HostVideoControls } from '../HostVideoControls';

describe('HostVideoControls', () => {
    const defaultProps = {
        isPlaying: false,
        currentTime: 0,
        duration: 100,
        volume: 1,
        isMuted: false,
        onPlayPause: vi.fn(),
        onSeek: vi.fn(),
        onVolumeChange: vi.fn(),
        onToggleMute: vi.fn(),
        isHostReady: true,
        isPresentationReady: true,
        isPresentationConnected: false,
        audioTarget: 'host' as const
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('volume slider', () => {
        it('should display correct volume value', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} volume={0.7} />
            );

            const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider).toBeTruthy();
            expect(volumeSlider.value).toBe('0.7');
        });

        it('should call onVolumeChange when slider value changes', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} />
            );

            const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            fireEvent.change(volumeSlider, { target: { value: '0.5' } });

            expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(0.5);
        });

        it('should be disabled when muted', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} isMuted={true} />
            );

            const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.disabled).toBe(true);
        });

        it('should be enabled when not muted', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} isMuted={false} />
            );

            const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.disabled).toBe(false);
        });

        it('should maintain volume value when mute state changes', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} volume={0.6} isMuted={false} />
            );

            let volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.value).toBe('0.6');

            // Mute the audio
            rerender(<HostVideoControls {...defaultProps} volume={0.6} isMuted={true} />);
            
            volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.value).toBe('0.6');
            expect(volumeSlider.disabled).toBe(true);

            // Unmute the audio
            rerender(<HostVideoControls {...defaultProps} volume={0.6} isMuted={false} />);
            
            volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.value).toBe('0.6');
            expect(volumeSlider.disabled).toBe(false);
        });
    });

    describe('mute button', () => {
        it('should show volume icon when not muted', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} isMuted={false} />
            );

            const muteButton = container.querySelector('button[aria-label="Mute"]');
            expect(muteButton).toBeTruthy();
        });

        it('should show mute icon when muted', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} isMuted={true} />
            );

            const unmuteButton = container.querySelector('button[aria-label="Unmute"]');
            expect(unmuteButton).toBeTruthy();
        });

        it('should call onToggleMute when clicked', () => {
            const { container } = render(
                <HostVideoControls {...defaultProps} />
            );

            const muteButton = container.querySelector('button[aria-label="Mute"]') as HTMLButtonElement;
            fireEvent.click(muteButton);

            expect(defaultProps.onToggleMute).toHaveBeenCalled();
        });
    });

    describe('volume persistence scenarios', () => {
        it('should reflect volume changes immediately', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} volume={0.5} />
            );

            let volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.value).toBe('0.5');

            // Update volume prop (simulating state change)
            rerender(<HostVideoControls {...defaultProps} volume={0.8} />);

            volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(volumeSlider.value).toBe('0.8');
        });

        it('should handle edge case volumes correctly', () => {
            const testCases = [0, 0.1, 0.5, 0.99, 1];

            testCases.forEach(volume => {
                const { container } = render(
                    <HostVideoControls {...defaultProps} volume={volume} />
                );

                const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
                expect(parseFloat(volumeSlider.value)).toBe(volume);
            });
        });

        it('should show correct audio target indicator', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} audioTarget="host" />
            );

            // Host audio
            let audioIndicator = container.querySelector('.text-xs.text-gray-500');
            expect(audioIndicator?.textContent).toContain('Host');

            // Presentation audio
            rerender(<HostVideoControls {...defaultProps} audioTarget="presentation" isPresentationConnected={true} />);
            
            audioIndicator = container.querySelector('.text-xs.text-gray-500');
            expect(audioIndicator?.textContent).toContain('Presentation');
        });

        it('should maintain consistent state during rapid prop changes', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} volume={0.5} />
            );

            // Simulate rapid volume changes
            const volumes = [0.3, 0.7, 0.4, 0.9, 0.6];
            volumes.forEach(volume => {
                rerender(<HostVideoControls {...defaultProps} volume={volume} />);
                const volumeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
                expect(parseFloat(volumeSlider.value)).toBe(volume);
            });
        });
    });

    describe('integration with video state', () => {
        it('should handle play/pause correctly', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} isPlaying={false} />
            );

            // Find play button
            let playButton = container.querySelector('button[aria-label="Play"]');
            expect(playButton).toBeTruthy();

            // Click play
            fireEvent.click(playButton!);
            expect(defaultProps.onPlayPause).toHaveBeenCalled();

            // Update to playing state
            rerender(<HostVideoControls {...defaultProps} isPlaying={true} />);

            // Should now show pause button
            const pauseButton = container.querySelector('button[aria-label="Pause"]');
            expect(pauseButton).toBeTruthy();
            expect(container.querySelector('button[aria-label="Play"]')).toBeFalsy();
        });

        it('should disable controls based on ready states', () => {
            const { container, rerender } = render(
                <HostVideoControls {...defaultProps} isHostReady={false} />
            );

            const playButton = container.querySelector('button[aria-label="Play"]') as HTMLButtonElement;
            expect(playButton.disabled).toBe(true);

            // Both ready
            rerender(<HostVideoControls {...defaultProps} isHostReady={true} isPresentationReady={true} />);
            expect(playButton.disabled).toBe(false);
        });
    });
});