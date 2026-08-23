import { Stack } from 'expo-router';
import { ActionTypesProvider } from '../src/context/ActionTypesContext';
import { EventsProvider } from '../src/context/EventsContext';
import { SettingsProvider } from '../src/context/SettingsContext';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="log-event" options={{ presentation: 'modal', headerShown: true, title: 'Log Event' }} />
          </Stack>
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
