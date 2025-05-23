// src/utils/windowUtils.ts

export const openStudentDisplay = (sessionId: string | null) => {
    if (!sessionId || sessionId === 'new') {
        console.warn("Cannot open student display without a valid session ID.");
        return null;
    }
    const features = 'width=1200,height=800,resizable=yes,scrollbars=yes,status=yes,menubar=no,toolbar=no,location=no';
    const studentDisplayUrl = `/student-display/${sessionId}`;
    const studentWindow = window.open(studentDisplayUrl, `StudentDisplay_${sessionId}`, features);

    if (studentWindow) {
        studentWindow.focus();
    }

    return studentWindow;
};