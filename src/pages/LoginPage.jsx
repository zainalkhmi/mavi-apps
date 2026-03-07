import React, { useState } from 'react';
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const LoginPage = () => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');

        if (!email || !password) {
            setMessage('Email dan password wajib diisi.');
            return;
        }

        if (mode === 'signup') {
            if (password.length < 6) {
                setMessage('Password minimal 6 karakter.');
                return;
            }

            if (password !== confirmPassword) {
                setMessage('Konfirmasi password tidak sama.');
                return;
            }
        }

        if (!isSupabaseConfigured || !supabase) {
            setMessage('Supabase belum dikonfigurasi. Login tidak tersedia.');
            return;
        }

        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password
                });

                if (error) throw error;

                if (!data?.session) {
                    setMessage('✅ Akun berhasil dibuat. Silakan cek email untuk verifikasi lalu login.');
                } else {
                    setMessage('✅ Akun berhasil dibuat dan kamu sudah login.');
                }
            }
        } catch (err) {
            setMessage(`❌ ${mode === 'login' ? 'Login' : 'Signup'} gagal: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setMessage('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-300 via-amber-200 to-orange-200 px-4 py-8">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/85 p-5 text-slate-100 shadow-2xl backdrop-blur-xl">
                <header className="mb-4 space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                        <ShieldCheck size={14} />
                        MAVI LOGIN
                    </div>
                    <h1 className="m-0 text-2xl font-bold tracking-tight">Masuk ke Aplikasi</h1>
                    <p className="m-0 text-sm text-slate-300">
                        {mode === 'login'
                            ? 'Gunakan akun Supabase untuk mengakses SOP Reader.'
                            : 'Daftarkan pengguna baru menggunakan Supabase Auth.'}
                    </p>
                </header>

                <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-900/70 p-1">
                    <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            mode === 'login' ? 'bg-yellow-300 text-slate-950' : 'text-slate-200'
                        }`}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            mode === 'signup' ? 'bg-yellow-300 text-slate-950' : 'text-slate-200'
                        }`}
                    >
                        Signup
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        autoComplete="email"
                        className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                    />

                    {mode === 'signup' ? (
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Konfirmasi Password"
                            autoComplete="new-password"
                            className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                        />
                    ) : null}

                    {message ? (
                        <div className="rounded-xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100">{message}</div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70"
                    >
                        {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                        {isSubmitting ? 'Memproses...' : mode === 'login' ? 'Login' : 'Signup'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;