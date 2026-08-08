import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import { registerForPushNotificationsAsync } from '../services/pushNotifications.js';
import TopNavBar from '../components/TopNavBar.jsx';
import LoginScreen from '../screens/LoginScreen.jsx';
import RegisterScreen from '../screens/RegisterScreen.jsx';
import AudiobookListScreen from '../screens/AudiobookListScreen.jsx';
import PlayerScreen from '../screens/PlayerScreen.jsx';
import ChatScreen from '../screens/ChatScreen.jsx';
import FlashcardsScreen from '../screens/FlashcardsScreen.jsx';
import DashboardScreen from '../screens/DashboardScreen.jsx';

const Stack = createNativeStackNavigator();

// TopNavBar replaces a native bottom tab bar - direct device feedback asked
// for the same top-navbar interface as techspeaking.dev. Screens are
// switched manually (not via a react-navigation tab navigator) since only
// AudiobookListScreen needs `navigation` (to push Player) and none of the
// three need `route` - a plain state switch is simpler and sidesteps any
// tab-bar-positioning quirks. `<StatusBar style="light" />` here overrides
// the app-wide theme-following status bar (App.jsx) while this always-black
// bar is on screen, so status bar icons don't go dark-on-black in light mode.
function MainTabs({ navigation }) {
  const [active, setActive] = useState('Audiobooks');
  const screens = {
    Audiobooks: <AudiobookListScreen navigation={navigation} />,
    Flashcards: <FlashcardsScreen />,
    Dashboard: <DashboardScreen navigation={navigation} onSelectTab={setActive} />,
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <TopNavBar active={active} onChange={setActive} />
      {screens[active]}
    </View>
  );
}

function AuthenticatedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ title: '' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Tutor IA' }} />
    </Stack.Navigator>
  );
}

// Swapping the whole navigator based on isAuthenticated (rather than
// per-screen guards, the web app's approach with ProtectedRoute) is the
// standard React Navigation pattern - it also resets navigation history on
// login/logout, so a logged-out user can never back-navigate into a
// screen that needed auth.
export default function AppNavigator() {
  const { isAuthenticated, isReady } = useAuth();
  const { isDark } = useTheme();

  // Registering on login (not on every app open) is deliberate - a token
  // is only useful once there's an account to associate it with server-
  // side, and no endpoint saves it yet (see IOS_BUILD.md/
  // ANDROID_BUILD.md's "not done" list - there's no
  // POST /api/user/push-token equivalent on the backend).
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {isAuthenticated ? (
        <AuthenticatedStack />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
