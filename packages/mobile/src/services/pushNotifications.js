import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Dia 91-95: client-side push registration, shared by both the iOS and
// Android build phases (the plan lists "push notifications" under both,
// but the JS-level registration code is identical - only APNs vs FCM
// credentials differ, and those live outside this repo in EAS/App Store
// Connect/Firebase, not in app code).
//
// Real delivery has never been exercised: getExpoPushTokenAsync needs a
// real EAS projectId (app.json's extra.eas.projectId is still a
// placeholder - no EAS account exists on this dev machine, see
// IOS_BUILD.md/ANDROID_BUILD.md) and remote push doesn't work on Expo's
// web target at all (Platform.OS === 'web' short-circuits below, same
// class of guard as Dia 65's isDesktop checks). What IS real and
// testable without any of that: the permission-request flow itself, and
// that this module never throws when unconfigured.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === 'REPLACE_WITH_REAL_EAS_PROJECT_ID') {
    console.warn('Push notifications: no real EAS projectId configured yet, skipping token fetch.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (err) {
    console.warn('Push notifications: failed to fetch Expo push token', err);
    return null;
  }
}
