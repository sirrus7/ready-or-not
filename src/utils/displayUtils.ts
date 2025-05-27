// src/utils/displayUtils.ts
export interface MonitorInfo {
    id: number;
    label: string;
    isPrimary: boolean;
    isInternal: boolean;
    width: number;
    height: number;
    left: number;
    top: number;
}

export const supportsWindowManagement = (): boolean => {
    return 'getScreenDetails' in window;
};

export const getDisplays = async (): Promise<MonitorInfo[]> => {
    if (!supportsWindowManagement()) {
        // Return a default single display
        return [{
            id: 0,
            label: 'Display 1',
            isPrimary: true,
            isInternal: false,
            width: window.screen.width,
            height: window.screen.height,
            left: 0,
            top: 0
        }];
    }

    try {
        // Request permission if needed
        const permission = await navigator.permissions.query({
            name: 'window-management' as PermissionName
        });

        if (permission.state === 'prompt') {
            // This will trigger the permission prompt
            await (window as any).getScreenDetails();
        }

        const screenDetails = await (window as any).getScreenDetails();

        return screenDetails.screens.map((screen: any, index: number) => ({
            id: index,
            label: screen.label || `Display ${index + 1}`,
            isPrimary: screen.isPrimary || false,
            isInternal: screen.isInternal || false,
            width: screen.width,
            height: screen.height,
            left: screen.left,
            top: screen.top
        }));
    } catch (error) {
        console.error('Error getting screen details:', error);
        // Return current screen as fallback
        return [{
            id: 0,
            label: 'Display 1',
            isPrimary: true,
            isInternal: false,
            width: window.screen.width,
            height: window.screen.height,
            left: 0,
            top: 0
        }];
    }
};

export const getSavedMonitorPreference = (sessionId: string): MonitorInfo | null => {
    const saved = localStorage.getItem(`preferredMonitor_${sessionId}`);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }
    return null;
};

export const saveMonitorPreference = (sessionId: string, monitor: MonitorInfo): void => {
    localStorage.setItem(`preferredMonitor_${sessionId}`, JSON.stringify(monitor));
};

export const openWindowOnMonitor = (
    url: string,
    windowName: string,
    monitor: MonitorInfo
): Window | null => {
    const features = [
        `left=${monitor.left}`,
        `top=${monitor.top}`,
        `width=${monitor.width}`,
        `height=${monitor.height}`,
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'scrollbars=no',
        'resizable=yes'
    ].join(',');

    const newWindow = window.open(url, windowName, features);

    if (newWindow) {
        // Attempt to fullscreen after window loads
        newWindow.addEventListener('load', () => {
            setTimeout(() => {
                if (newWindow.document.documentElement.requestFullscreen) {
                    newWindow.document.documentElement.requestFullscreen().catch(err => {
                        console.log('Fullscreen request failed:', err);
                    });
                }
            }, 500);
        });
    }

    return newWindow;
};