import { Capacitor } from '@capacitor/core';

export const isNative = () => {
    return Capacitor.isNativePlatform();
};

export const getPlatformRedirectUrl = () => {
    if (isNative()) {
        return 'avalanche-scouting://login-callback';
    }
    return typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
};
