import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import SopListPage from './pages/SopListPage';
import SettingsPage from './pages/SettingsPage';
import SopViewerPage from './pages/SopViewerPage';
import DataPage from './pages/DataPage';
import LoginPage from './pages/LoginPage';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const App = () => {
    const [session, setSession] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setIsAuthLoading(false);
            return undefined;
        }

        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data?.session ?? null);
            setIsAuthLoading(false);
        });

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession ?? null);
            setIsAuthLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const isAuthenticated = !isSupabaseConfigured || Boolean(session);

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-300 via-amber-200 to-orange-200 px-4 py-8">
                <div className="mx-auto w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/85 p-5 text-slate-100 shadow-2xl backdrop-blur-xl">
                    <p className="m-0 text-sm text-slate-300">Memuat sesi login...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            />

            <Route element={isAuthenticated ? <MobileLayout /> : <Navigate to="/login" replace />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/sop" element={<SopListPage />} />
                <Route path="/sop/:manualId" element={<SopViewerPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
    );
};

export default App;
