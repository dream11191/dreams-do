import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import AuthPage from './components/AuthPage';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import ScheduleDetail from './pages/ScheduleDetail';
import DayDetail from './pages/DayDetail';
import Ledger from './pages/Ledger';
import Study from './pages/Study';
import Material from './pages/Material';
import Overdue from './pages/Overdue';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename="/dreams-do">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/schedule/:id" element={<ScheduleDetail />} />
              <Route path="/day/:date" element={<DayDetail />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/study" element={<Study />} />
              <Route path="/material" element={<Material />} />
              <Route path="/overdue" element={<Overdue />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}