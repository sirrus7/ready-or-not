// src/utils/videoUtils.ts - Consolidated video utilities
export const isVideoUrl = (url?: string): boolean => {
    if (!url) return false;
    return /\.(mp4|webm|ogg)$/i.test(url);
};

export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getVideoFallbackContent = (slideId: number, videoUrl: string) => ({
    title: "Video Content Summary",
    learningPoints: [
        "Students are watching instructional content",
        "Key concepts being covered based on current phase",
        "Real-world scenarios being demonstrated",
        "Students should be taking notes on key points"
    ],
    teacherNotes: [
        "Monitor student engagement during video",
        "Prepare for discussion after video ends",
        "Next phase will build on this content"
    ],
    estimatedDuration: "3-5 minutes"
});

// Combine display and window utilities here if needed
export const openStudentDisplay = (sessionId: string): Window | null => {
    const url = `/student-display/${sessionId}`;
    const features = 'width=1920,height=1080,menubar=no,toolbar=no';
    return window.open(url, 'studentDisplay', features);
};
