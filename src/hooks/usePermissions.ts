import { useState, useCallback } from 'react';
import { Capacitor, type PermissionState as CapacitorPermissionState } from '@capacitor/core';
import { Camera, type CameraPermissionState } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export type PermissionType = 'camera' | 'microphone' | 'photos' | 'location';

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
   * Check camera permission status
   */
  const checkCameraPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative || !Camera) {
      // On web, camera access is handled by browser
      // Or if plugin not installed, assume web behavior
      return { status: 'granted', canRequest: true };
    }

    try {
      const result = await Camera.checkPermissions();
      const status = result.camera as CameraPermissionState;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Camera access denied. Enable in Settings > Hisabify > Camera'
          : undefined
      };
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return {
        status: 'unknown',
        canRequest: false,
        message: 'Unable to check camera permission'
      };
    }
  }, [isNative]);

  /**
   * Request camera permission
   */
  const requestCameraPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative || !Camera) {
      return { status: 'granted', canRequest: true };
    }

    setChecking(true);
    try {
      const result = await Camera.requestPermissions({ permissions: ['camera'] });
      const status = result.camera as CameraPermissionState;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Camera access denied. Please enable in device settings.'
          : undefined
      };
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return {
        status: 'denied',
        canRequest: false,
        message: 'Failed to request camera permission'
      };
    } finally {
      setChecking(false);
    }
  }, [isNative]);

  /**
   * Check photos permission status
   */
  const checkPhotosPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative || !Camera) {
      return { status: 'granted', canRequest: true };
    }

    try {
      const result = await Camera.checkPermissions();
      const status = result.photos as CameraPermissionState;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Photo library access denied. Enable in Settings > Hisabify > Photos'
          : undefined
      };
    } catch (error) {
      console.error('Error checking photos permission:', error);
      return {
        status: 'unknown',
        canRequest: false,
        message: 'Unable to check photos permission'
      };
    }
  }, [isNative]);

  /**
   * Request photos permission
   */
  const requestPhotosPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isNative || !Camera) {
      return { status: 'granted', canRequest: true };
    }

    setChecking(true);
    try {
      const result = await Camera.requestPermissions({ permissions: ['photos'] });
      const status = result.photos as CameraPermissionState;

      return {
        status,
        canRequest: status !== 'denied',
        message: status === 'denied'
          ? 'Photo library access denied. Please enable in device settings.'
          : undefined
      };
    } catch (error) {
      console.error('Error requesting photos permission:', error);
      return {
        status: 'denied',
        canRequest: false,
        message: 'Failed to request photos permission'
      };
    } finally {
      setChecking(false);
    }
  }, [isNative]);

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
      case 'camera':
        checkFn = checkCameraPermission;
        requestFn = requestCameraPermission;
        break;
      case 'photos':
        checkFn = checkPhotosPermission;
        requestFn = requestPhotosPermission;
        break;
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
    checkCameraPermission,
    requestCameraPermission,
    checkPhotosPermission,
    requestPhotosPermission,
    checkMicrophonePermission,
    requestMicrophonePermission,
    checkLocationPermission,
    requestLocationPermission
  ]);

  return {
    isNative,
    checking,
    checkCameraPermission,
    requestCameraPermission,
    checkPhotosPermission,
    requestPhotosPermission,
    checkMicrophonePermission,
    requestMicrophonePermission,
    checkLocationPermission,
    requestLocationPermission,
    ensurePermission
  };
}
