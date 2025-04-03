import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resetPassword } from '../../lib/auth';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';

export function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    
    checkSession();
  }, [navigate]);

  // Password validation
  useEffect(() => {
    const errors: string[] = [];
    
    if (password) {
      if (password.length < 8) {
        errors.push(t('auth:resetPassword.requirements.length'));
      }
      if (!/[A-Z]/.test(password)) {
        errors.push(t('auth:resetPassword.requirements.uppercase'));
      }
      if (!/[a-z]/.test(password)) {
        errors.push(t('auth:resetPassword.requirements.lowercase'));
      }
      if (!/[0-9]/.test(password)) {
        errors.push(t('auth:resetPassword.requirements.number'));
      }
      if (confirmPassword && password !== confirmPassword) {
        errors.push(t('auth:resetPassword.requirements.match'));
      }
    }

    setValidationErrors(errors);
  }, [password, confirmPassword, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationErrors.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { success, error } = await resetPassword(password);

      if (!success) {
        throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('auth:resetPassword.errors.unknown'));
      console.error('Update password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t('app.name', { ns: 'common' })}</h1>
            <h2 className="text-gray-600">{t('auth:resetPassword.title')}</h2>
          </div>
          <LanguageSwitcher />
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center text-green-500">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="text-gray-900 font-medium">
              {t('auth:resetPassword.success')}
            </div>
            <p className="text-gray-600">
              {t('auth:resetPassword.redirect')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth:resetPassword.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    validationErrors.length > 0 ? 'border-red-500' : ''
                  }`}
                  placeholder={t('auth:resetPassword.newPasswordPlaceholder')}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth:resetPassword.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    validationErrors.length > 0 ? 'border-red-500' : ''
                  }`}
                  placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
                />
                <Lock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <div className="text-sm text-red-600">
                    <div className="font-medium mb-1">
                      {t('auth:resetPassword.requirements.title')}
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || validationErrors.length > 0}
              className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? t('status.loading', { ns: 'common' }) : t('auth:resetPassword.submit')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('auth:resetPassword.backToLogin')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}