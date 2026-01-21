// @ts-nocheck
'use client';


import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const from = '/dashboard';

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                router.push(from);
                router.refresh();
            } else {
                setError('Invalid password');
            }
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-slate-200">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-indigo-100 rounded-full">
                        <Lock className="h-8 w-8 text-indigo-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Admin Access</h1>
                <p className="text-slate-500 text-center text-sm mb-6">Please enter the password to continue.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-red-500 text-xs font-semibold text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                        Login
                    </button>
                </form>
            </div>
        </main>
    );
}
