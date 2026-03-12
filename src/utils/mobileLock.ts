export const lockScreenOrientation = async (): Promise<boolean> => {
    try {
        const docElm = document.documentElement as HTMLElement & {
            requestFullscreen?: () => Promise<void>;
            webkitRequestFullscreen?: () => Promise<void>;
            msRequestFullscreen?: () => Promise<void>;
        };

        if (docElm.requestFullscreen) {
            await docElm.requestFullscreen();
        } else if (docElm.webkitRequestFullscreen) {
            await docElm.webkitRequestFullscreen();
        } else if (docElm.msRequestFullscreen) {
            await docElm.msRequestFullscreen();
        }

        // Try to lock orientation to landscape
        const orientation = (screen.orientation as any);
        if (orientation && orientation.lock) {
            await orientation.lock('landscape');
        }

        return true;
    } catch (err) {
        console.warn('Could not lock screen orientation or enter fullscreen.', err);
        return false;
    }
};

export const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
