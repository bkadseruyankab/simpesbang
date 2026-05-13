'use client'

import { useState, useCallback } from 'react'
import { Shield, Eye, EyeOff, Loader2, Car } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

function getRememberedEmail(): { email: string; remember: boolean } {
  if (typeof window === 'undefined') return { email: '', remember: false }
  try {
    const saved = localStorage.getItem('bkad_remember_email')
    if (saved) return { email: saved, remember: true }
  } catch {
    // ignore
  }
  return { email: '', remember: false }
}

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState(() => getRememberedEmail().email)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => getRememberedEmail().remember)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email harus diisi')
      return
    }
    if (!password.trim()) {
      setError('Password harus diisi')
      return
    }

    try {
      await login(email, password)
      if (rememberMe) {
        try {
          localStorage.setItem('bkad_remember_email', email)
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem('bkad_remember_email')
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.')
    }
  }, [email, password, rememberMe, login])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-slate-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/10 rounded-full" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/8 rounded-full" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative animate-[fadeInUp_0.7s_ease-out_both]">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header Section */}
          <div className="pt-8 pb-6 px-8 text-center">
            {/* Logo */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg ring-4 ring-slate-200/50">
              <Shield className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sistem Informasi Service Kendaraan
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 font-medium">
              Badan Keuangan dan Aset Daerah
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Car className="h-3.5 w-3.5" />
              <span>Kota Surabaya</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@bkad.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-slate-50/80 border-slate-200 focus:border-slate-500 focus:ring-slate-500/20 placeholder:text-slate-400 transition-colors"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-slate-50/80 border-slate-200 focus:border-slate-500 focus:ring-slate-500/20 placeholder:text-slate-400 pr-10 transition-colors"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
              />
              <Label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">
                Ingat email saya
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-900/25 transition-all duration-200 font-semibold text-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Masuk'
              )}
            </Button>

            {/* Demo credentials hint */}
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Akun Demo:</p>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">superadmin@bkad.go.id</span> / <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin123</span>
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin@bkad.go.id</span> / <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin123</span>
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">bengkel@jaya-makmur.co.id</span> / <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">bengkel123</span>
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">pimpinan@bkad.go.id</span> / <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">pimpinan123</span>
                </p>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 pt-0">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent mb-4" />
            <p className="text-center text-xs text-slate-400">
              &copy; 2025 BKAD Kota Surabaya
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
