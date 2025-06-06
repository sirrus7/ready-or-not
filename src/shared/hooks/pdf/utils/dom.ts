export const createCaptureContainer = (): HTMLElement => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    return container;
};

export const cleanupCaptureContainer = (container: HTMLElement): void => {
    if (container.parentElement) {
        container.parentElement.removeChild(container);
    }
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};