import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'techspeak_auth';

export async function loadStoredAuth() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveStoredAuth(auth) {
  if (auth) {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } else {
    await AsyncStorage.removeItem(AUTH_KEY);
  }
}
