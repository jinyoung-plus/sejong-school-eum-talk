import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Header from './components/common/old_Header';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import MapExplore from './pages/MapExplore';
import Compare from './pages/Compare';
import Statistics from './pages/Statistics';
import SchoolDetail from './pages/SchoolDetail';
import DataManage from './pages/DataManage';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Profile from './pages/Profile';

import SchoolStatus from './pages/SchoolStatus';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapExplore />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/school/:id" element={<SchoolDetail />} />
            <Route path="/data" element={<DataManage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/schools" element={<SchoolStatus />} />

          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
