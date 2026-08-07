import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import { registerForPushNotificationsAsync } from '../services/pushNotifications.js';
import LoginScreen from '../screens/LoginScreen.jsx';
import RegisterScreen from '../screens/RegisterScreen.jsx';
import AudiobookListScreen from '../screens/AudiobookListScreen.jsx';
import PlayerScreen from '../screens/PlayerScreen.jsx';
import ChatScreen from '../screens/ChatScreen.jsx';
import FlashcardsScreen from '../screens/FlashcardsScreen.jsx';
import DashboardScreen from '../screens/DashboardScreen.jsx';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} hitSlop={12} style={{ marginRight: 12 }}>
      <Text style={{ color: '#2563eb' }}>Sair</Text>
    </Pressable>
  );
}

// Cycles light -> dark -> system -> light, same order as the web app's
// ThemeToggle - the icon is the mode you'd land on next, matching that
// existing convention rather than the mode currently active.
function ThemeToggleButton() {
  const { theme, cycleTheme } = useTheme();
  const nextIcon = { light: '🌙', dark: '💻', system: '☀️' }[theme];
  return (
    <Pressable onPress={cycleTheme} hitSlop={12} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 16 }}>{nextIcon}</Text>
    </Pressable>
  );
}

function HeaderRight() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ThemeToggleButton />
      <LogoutButton />
    </View>
  );
}

// Bottom tabs are the app's home base once authenticated (Dia 86-90's
// "Dashboard"/"Flashcards" priorities live here); Player and Chat are
// pushed on top as stack screens from Audiobooks, since a player/chat
// session isn't itself a top-level destination.
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerRight: () => <HeaderRight /> }}>
      <Tab.Screen name="Audiobooks" component={AudiobookListScreen} />
      <Tab.Screen name="Flashcards" component={FlashcardsScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
    </Tab.Navigator>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
