// src/utils/windowUtils.ts

export const openStudentDisplay = (sessionId: string | null) => {
    if (!sessionId || sessionId === 'new') {
        console.warn("Cannot open student display without a valid session ID.");
        // Optionally, you could open a placeholder page or show an alert to the teacher
        // For now, we'll just prevent opening.
        // window.alert("A game session must be active or created first to launch the student display.");
        return null;
    }

    // Features for the new window
    const features = 'width=1200,height=800,resizable=yes,scrollbars=yes,status=yes,menubar=no,toolbar=no,location=no';

    // Open a new window with the student display URL including the session ID
    // Using a path parameter for cleaner URLs: /student-display/:sessionId
    const studentDisplayUrl = `/student-display/${sessionId}`;

    const studentWindow = window.open(studentDisplayUrl, `StudentDisplay_${sessionId}`, features); // Unique name per session

    // Focus the new window
    if (studentWindow) {
        studentWindow.focus();
    }

    return studentWindow;
};

export const isSecondaryWindow = (): boolean => {
    // Check if the window name starts with 'StudentDisplay_'
    // This makes it more robust if multiple student displays for different sessions might be open (though unlikely on same browser)
    return window.name.startsWith('StudentDisplay_');
};