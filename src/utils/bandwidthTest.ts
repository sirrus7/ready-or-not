// src/utils/bandwidthTest.ts
export interface BandwidthTestResult {
    downloadSpeedMbps: number;
    uploadSpeedMbps: number;
    latencyMs: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendation: string;
    canHandleVideo: boolean;
}

export interface BandwidthTestProgress {
    phase: 'download' | 'upload' | 'latency' | 'complete';
    progress: number; // 0-100
    currentSpeedMbps?: number;
}

const TEST_FILE_SIZES = [
    { size: 1024 * 100, name: '100KB' },    // 100KB
    { size: 1024 * 500, name: '500KB' },    // 500KB
    { size: 1024 * 1024, name: '1MB' },     // 1MB
    { size: 1024 * 1024 * 2, name: '2MB' }  // 2MB
];

export class BandwidthTester {
    private onProgressCallback?: (progress: BandwidthTestProgress) => void;

    constructor(onProgress?: (progress: BandwidthTestProgress) => void) {
        this.onProgressCallback = onProgress;
    }

    private updateProgress(phase: BandwidthTestProgress['phase'], progress: number, currentSpeedMbps?: number) {
        if (this.onProgressCallback) {
            this.onProgressCallback({ phase, progress, currentSpeedMbps });
        }
    }

    async testBandwidth(): Promise<BandwidthTestResult> {
        try {
            // Test download speed
            this.updateProgress('download', 0);
            const downloadSpeed = await this.testDownloadSpeed();

            // Test upload speed (simplified - using small data)
            this.updateProgress('upload', 0);
            const uploadSpeed = await this.testUploadSpeed();

            // Test latency
            this.updateProgress('latency', 0);
            const latency = await this.testLatency();

            this.updateProgress('complete', 100);

            return this.analyzeResults(downloadSpeed, uploadSpeed, latency);
        } catch (error) {
            console.error('Bandwidth test failed:', error);
            // Return conservative estimate on failure
            return {
                downloadSpeedMbps: 5,
                uploadSpeedMbps: 1,
                latencyMs: 100,
                quality: 'fair',
                recommendation: 'Unable to test connection speed. Consider disabling host video if you experience lag.',
                canHandleVideo: false
            };
        }
    }

    private async testDownloadSpeed(): Promise<number> {
        const speeds: number[] = [];

        for (let i = 0; i < TEST_FILE_SIZES.length; i++) {
            const testFile = TEST_FILE_SIZES[i];
            this.updateProgress('download', (i / TEST_FILE_SIZES.length) * 100);

            const speed = await this.downloadTest(testFile.size);
            speeds.push(speed);

            this.updateProgress('download', ((i + 1) / TEST_FILE_SIZES.length) * 100, speed);

            // Progressive testing - if speed is consistently low, don't test larger files
            if (i > 0 && speeds.every(s => s < 2)) {
                break;
            }
        }

        // Return median speed to avoid outliers
        speeds.sort((a, b) => a - b);
        return speeds[Math.floor(speeds.length / 2)];
    }

    private async downloadTest(sizeBytes: number): Promise<number> {
        // Create a blob of the specified size for testing
        const testData = new Uint8Array(sizeBytes);
        const blob = new Blob([testData]);
        const url = URL.createObjectURL(blob);

        try {
            const startTime = performance.now();
            const response = await fetch(url);
            await response.arrayBuffer();
            const endTime = performance.now();

            const durationSeconds = (endTime - startTime) / 1000;
            const speedMbps = (sizeBytes * 8) / (durationSeconds * 1024 * 1024);

            return speedMbps;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    private async testUploadSpeed(): Promise<number> {
        // Simplified upload test using a small POST request
        const testData = new Uint8Array(1024 * 50); // 50KB test
        const blob = new Blob([testData]);

        try {
            const startTime = performance.now();

            // Use a reliable endpoint for testing (httpbin.org or similar)
            const response = await fetch('https://httpbin.org/post', {
                method: 'POST',
                body: blob,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            if (response.ok) {
                const endTime = performance.now();
                const durationSeconds = (endTime - startTime) / 1000;
                const speedMbps = (testData.length * 8) / (durationSeconds * 1024 * 1024);
                return speedMbps;
            }
        } catch (error) {
            console.warn('Upload test failed, using conservative estimate:', error);
        }

        // Conservative fallback
        return 1;
    }

    private async testLatency(): Promise<number> {
        const latencies: number[] = [];

        for (let i = 0; i < 3; i++) {
            this.updateProgress('latency', (i / 3) * 100);

            try {
                const startTime = performance.now();
                await fetch('https://httpbin.org/get', {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const endTime = performance.now();

                latencies.push(endTime - startTime);
            } catch (error) {
                latencies.push(200); // Conservative estimate on failure
            }
        }

        this.updateProgress('latency', 100);

        // Return average latency
        return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    }

    private analyzeResults(downloadSpeedMbps: number, uploadSpeedMbps: number, latencyMs: number): BandwidthTestResult {
        let quality: BandwidthTestResult['quality'];
        let recommendation: string;
        let canHandleVideo: boolean;

        // Determine quality based on download speed and latency
        if (downloadSpeedMbps >= 25 && latencyMs < 50) {
            quality = 'excellent';
            recommendation = 'Your connection is excellent! Video should work smoothly on both screens.';
            canHandleVideo = true;
        } else if (downloadSpeedMbps >= 15 && latencyMs < 100) {
            quality = 'good';
            recommendation = 'Your connection is good. Video should work well, but you may want to consider disabling host video for optimal performance.';
            canHandleVideo = true;
        } else if (downloadSpeedMbps >= 8 && latencyMs < 200) {
            quality = 'fair';
            recommendation = 'Your connection is fair. We recommend disabling host video and positioning yourself to see the presentation screen for the best experience.';
            canHandleVideo = false;
        } else {
            quality = 'poor';
            recommendation = 'Your connection may struggle with video. We strongly recommend disabling host video and using the presentation screen for video content.';
            canHandleVideo = false;
        }

        return {
            downloadSpeedMbps: Math.round(downloadSpeedMbps * 10) / 10,
            uploadSpeedMbps: Math.round(uploadSpeedMbps * 10) / 10,
            latencyMs: Math.round(latencyMs),
            quality,
            recommendation,
            canHandleVideo
        };
    }
}

// Utility function for quick bandwidth test
export const quickBandwidthTest = async (): Promise<BandwidthTestResult> => {
    const tester = new BandwidthTester();
    return await tester.testBandwidth();
};