// src/utils/windowUtils.ts
import { MonitorInfo, openWindowOnMonitor } from './displayUtils';

export const openStudentDisplay = (sessionId: string | null, monitor?: MonitorInfo): Window | null => {
    if (!sessionId) {
        console.error('Cannot open student display without a session ID');
        return null;
    }

    const url = `/student-display/${sessionId}`;

    if (monitor) {
        return openWindowOnMonitor(url, 'studentDisplay', monitor);
    } else {
        // Fallback to simple window.open
        const width = 1920;
        const height = 1080;
        const left = window.screen.width - width;
        const top = 0;

        const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;

        return window.open(url, 'studentDisplay', features);
    }
};