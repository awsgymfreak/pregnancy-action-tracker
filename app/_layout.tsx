import { Stack } from 'expo-router';
import { ActionTypesProvider } from '../src/context/ActionTypesContext';
import { EventsProvider } from '../src/context/EventsContext';
import { SettingsProvider } from '../src/context/SettingsContext';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
