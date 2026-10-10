import { Stack } from 'expo-router/stack';
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" options={{ title: 'Spotter — Mat' }} /><Stack.Screen name="watch" options={{ title: 'Spotter watch controls' }} /></Stack>;
}
