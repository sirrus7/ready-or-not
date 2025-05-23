// src/utils/windowUtils.ts

export const openStudentDisplay = (sessionId: string | null) => {
    if (!sessionId || sessionId === 'new') {
        console.warn("Cannot open student display without a valid session ID.");
        return null;
    }

    // Fix: Use the correct route format that matches your App.tsx routing
    const studentDisplayUrl = `/student-display/${sessionId}`;

    console.log(`[windowUtils] Opening student display with URL: ${studentDisplayUrl}`);
    console.log(`[windowUtils] Session ID: ${sessionId}`);

    // Try to open in a new tab first (no features = new tab in most browsers)
    const studentWindow = window.open(studentDisplayUrl, `StudentDisplay_${sessionId}`);

    // If popup blocker or other issues, try with minimal features that encourage tab behavior
    if (!studentWindow) {
        console.warn("Initial tab open failed, trying with minimal features");
        const fallbackWindow = window.open(
            studentDisplayUrl,
            `StudentDisplay_${sessionId}`,
            'noopener,noreferrer'
        );

        if (fallbackWindow) {
            fallbackWindow.focus();
        }

        return fallbackWindow;
    }

    if (studentWindow) {
        studentWindow.focus();
    }

    return studentWindow;
};