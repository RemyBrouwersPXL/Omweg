import * as Location from 'expo-location';

/**
 * - `background`: updates keep flowing with the screen off / app in background.
 * - `foreground`: also works: the foreground service keeps updates flowing once it
 *   was started on screen, though some OEMs throttle it harder.
 * - `denied`: no usable location.
 */
export type LocationAccess = 'background' | 'foreground' | 'denied';

/**
 * Android flow: the system dialog asks for coarse + fine together (the user may
 * downgrade to approximate). Background is a separate request that only works
 * after foreground is granted; on Android 11+ it opens the app's settings page.
 * Call this from a user action (for example a "Ready" button), never from a task.
 */
export async function requestLocationPermissions(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';

  // Approximate-only (coarse) is useless for a manhunt: positions jitter by ~1-3 km.
  if (fg.android?.accuracy === 'coarse') return 'denied';

  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

/** Checks current access without prompting. */
export async function getLocationAccess(): Promise<LocationAccess> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted' || fg.android?.accuracy === 'coarse') return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

/** Requests location access from a user action; throws a user-facing message if unusable. */
export async function requireLocationAccess(): Promise<LocationAccess> {
  const access = await requestLocationPermissions();
  if (access === 'denied') {
    throw new Error('Precise location is required to play Manhunt. Enable it in your phone settings.');
  }
  return access;
}
