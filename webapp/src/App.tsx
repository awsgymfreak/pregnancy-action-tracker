import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ActionTypesProvider } from './context/ActionTypesContext';
import { EventsProvider } from './context/EventsContext';
import { SettingsProvider } from './context/SettingsContext';
import { NavBar } from './components/NavBar';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ActionsPage } from './pages/ActionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogEventPage } from './pages/LogEventPage';

export default function App() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <BrowserRouter>
            <main className="page-content">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/log-event" element={<LogEventPage />} />
                <Route path="/log-event/:eventId" element={<LogEventPage />} />
              </Routes>
            </main>
            <NavBar />
          </BrowserRouter>
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
