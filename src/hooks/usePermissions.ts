import { useState, useCallback } from 'react';
import { Capacitor, type PermissionState as CapacitorPermissionState } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/* No 'camera' member on purpose. Capacitor's own BridgeWebChromeClient already requests
   CAMERA when it sees a capture-enabled <input type="file"> (isMediaCaptureSupported() ->
   permissionLauncher.launch), so a second gate here only duplicated it — and the
   @capacitor/camera plugin it needed dragged in com.google.android.material, whose
   BottomSheetDialog calls the Window.setStatusBarColor that Play flags as deprecated in
   Android 15. That dialog is unreachable for us: it only opens from getPhoto(), which this
   app never calls. Don't re-add a camera gate; let the bridge ask. */
export type PermissionType = 'microphone' | 'location';

export type PermissionStatus = CapacitorPermissionState | 'limited' | 'unknown';

interface PermissionResult {
  status: PermissionStatus;
  canRequest: boolean;
  message?: string;
}

export function usePermissions() {
  const [checking, setChecking] = useState(false);

  /**
   * Check if running on native platform
   */
  const isNative = Capacitor.isNativePlatform();

  /**
   * Check microphone permission status (Web Speech API / native)
   */
  const checkMicrophonePermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative) {
      // On web, check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          status: 'denied',
          canRequest: false,
          message: 'Microphone not supported in this browser'
        };
      }

      // Try to check permission via Permissions API
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return {
          status: result.state as PermissionStatus,
          canRequest: result.state !== 'denied'
        };
      } catch {
        // Permissions API not available, assume we need to request
        return { status: 'prompt', canRequest: true };
      }
    }

    // For native, we need to use platform-specific checks
    // Capacitor doesn't have built-in microphone permission check
    // We'll rely on Web Speech API which handles it automatically
    return { status: 'prompt', canRequest: true };
  }, [isNative]);

  /**
   * Request microphone permission
   */
  const requestMicrophonePermission = useCallback(async (): Promise<PermissionResult> => {
    setChecking(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          status: 'denied',
          canRequest: false,
          message: 'Microphone not supported'
        };
      }

      // Request access by actually trying to get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop all tracks immediately (we just needed to check permission)
      stream.getTracks().forEach(track => track.stop());

      return {
        status: 'granted',
        canRequest: true
      };
    } catch (error: unknown) {
      console.error('Error requesting microphone permission:', error);

      const errorName = error instanceof Error ? error.name : '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return {
          status: 'denied',
          canRequest: false,
          message: 'Microphone access denied. Please enable in device settings.'
        };
      }

      return {
        status: 'denied',
        canRequest: false,
        message: 'Failed to access microphone'
      };
    } finally {
      setChecking(false);
    }
  }, []);

  /**
   * Check location permission status
   */
  const checkLocationPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative || !Geolocation) {
      // On web, check Geolocation API
      if (!navigator.geolocation) {
        return {
          status: 'denied',
          canRequest: false,
          message: 'Geolocation not supported in this browser'
        };
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return {
          status: result.state as PermissionStatus,
          canRequest: result.state !== 'denied'
        };
      } catch {
        return { status: 'prompt', canRequest: true };
      }
    }

    try {
      const result = await Geolocation.checkPermissions();
      const status = result.location as PermissionStatus;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Location access denied. Enable in Settings > Hisabify > Location'
          : undefined
      };
    } catch (error) {
      console.error('Error checking location permission:', error);
      return {
        status: 'unknown',
        canRequest: false,
        message: 'Unable to check location permission'
      };
    }
  }, [isNative]);

  /**
   * Request location permission
   */
  const requestLocationPermission = useCallback(async (): Promise<PermissionResult> => {
    setChecking(true);
    try {
      if (!isNative || !Geolocation) {
        // Web: Try to get current position (triggers permission)
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });

        return { status: 'granted', canRequest: true };
      }

      const result = await Geolocation.requestPermissions();
      const status = result.location as PermissionStatus;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Location access denied. Please enable in device settings.'
          : undefined
      };
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return {
        status: 'denied',
        canRequest: false,
        message: 'Failed to request location permission'
      };
    } finally {
      setChecking(false);
    }
  }, [isNative]);

  /**
   * Generic permission checker with auto-request
   */
  const ensurePermission = useCallback(async (type: PermissionType): Promise<boolean> => {
    let checkFn: () => Promise<PermissionResult>;
    let requestFn: () => Promise<PermissionResult>;

    switch (type) {
      case 'microphone':
        checkFn = checkMicrophonePermission;
        requestFn = requestMicrophonePermission;
        break;
      case 'location':
        checkFn = checkLocationPermission;
        requestFn = requestLocationPermission;
        break;
      default:
        return false;
    }

    // Check current status
    const checkResult = await checkFn();

    if (checkResult.status === 'granted') {
      return true;
    }

    // If denied permanently, can't request again
    if (checkResult.status === 'denied' && !checkResult.canRequest) {
      console.warn(`Permission ${type} denied permanently:`, checkResult.message);
      return false;
    }

    // Request permission
    const requestResult = await requestFn();
    return requestResult.status === 'granted';
  }, [
    checkMicrophonePermission,
    requestMicrophonePermission,
    checkLocationPermission,
    requestLocationPermission
  ]);

  return {
    isNative,
    checking,
    checkMicrophonePermission,
    requestMicrophonePermission,
    checkLocationPermission,
    requestLocationPermission,
    ensurePermission
  };
}
