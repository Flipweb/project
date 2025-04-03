import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { requestPasswordReset } from '../../lib/auth';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['auth', 'common']);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(t('auth:login.errors.invalidCredentials'));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!email) {
      setResetError(t('auth:login.errors.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setResetError(t('auth:errors.invalidEmail'));
      return;
    }

    setLoading(true);
    setResetError(null);

    try {
      const { success, error } = await requestPasswordReset(email);

      if (!success && error) {
        throw new Error(error.message);
      }

      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message);
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-1">{t('app.name', { ns: 'common' })}</h1>
          <h2 className="text-gray-600 mb-8">{t('auth:resetPassword.title')}</h2>
          
          <div className="space-y-6">
            <div className="flex justify-center text-green-500 mb-4">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div>
              <p className="text-gray-900 font-medium mb-2">
                {t('auth:resetPassword.emailSent')}
              </p>
              <p className="text-gray-600">
                {t('auth:resetPassword.emailSentTo', { email })}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {t('auth:verification.checkSpam')}
            </div>

            <button
              type="button"
              onClick={() => {
                setResetSent(false);
                setEmail('');
                setResetError(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t('auth:resetPassword.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t('app.name', { ns: 'common' })}</h1>
            <h2 className="text-gray-600">{t('auth:login.title')}</h2>
          </div>
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth:login.email')}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetError(null);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  resetError ? 'border-red-500' : ''
                }`}
                placeholder={t('auth:login.emailPlaceholder')}
              />
              <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth:login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={t('auth:login.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-600">
                {t('auth:login.rememberMe')}
              </label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {t('auth:login.forgotPassword')}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          )}

          {resetError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <div className="text-sm text-red-600">{resetError}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? t('status.loading', { ns: 'common' }) : t('auth:login.submit')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t('auth:login.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}