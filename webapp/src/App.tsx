import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionTypesProvider } from './context/ActionTypesContext';
import { EventsProvider } from './context/EventsContext';
import { SettingsProvider } from './context/SettingsContext';
import { HistoryFilterProvider } from './context/HistoryFilterContext';
import { RemindersProvider } from './context/RemindersContext';
import { NavBar } from './components/NavBar';
import { ReminderBanner } from './components/ReminderBanner';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ActionsPage } from './pages/ActionsPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogEventPage } from './pages/LogEventPage';

export default function App() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <RemindersProvider>
            <HistoryFilterProvider>
              <HashRouter>
                <main className="page-content">
                  <ReminderBanner />
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/actions" element={<ActionsPage />} />
                    <Route path="/reminders" element={<RemindersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/log-event" element={<LogEventPage />} />
                    <Route path="/log-event/:eventId" element={<LogEventPage />} />
                  </Routes>
                </main>
                <NavBar />
              </HashRouter>
            </HistoryFilterProvider>
          </RemindersProvider>
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
