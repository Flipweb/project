import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logEmailEvent } from '../../lib/emailTracking';

export function RegisterForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPassword = (password: string) => {
    return password.length >= 8;
  };

  const isFormValid = () => {
    return isValidEmail(email) && isValidPassword(password) && agreed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await logEmailEvent({
        email,
        event: 'registration_started',
        status: 'pending'
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_APP_URL}/verify-email`,
          data: {
            agreed_to_terms: agreed
          }
        }
      });

      if (error) {
        await logEmailEvent({
          email,
          event: 'signup_failed',
          status: 'error',
          error: error.message
        });
        throw error;
      }

      if (data?.user) {
        await logEmailEvent({
          user_id: data.user.id,
          email,
          event: 'signup_completed',
          status: 'success'
        });
        
        navigate('/verify-email', { state: { email } });
      }
    } catch (err: any) {
      setError(err.message === 'User already registered'
        ? 'Этот email уже зарегистрирован'
        : 'Ошибка при регистрации. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Контур</h1>
        <h2 className="text-gray-600 mb-8">Регистрация</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Почта
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Введите email"
              />
              <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Минимум 8 символов"
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
            <p className="text-sm text-gray-500 mt-1">Минимум 8 символов</p>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-600">
              Регистрируясь, вы соглашаетесь на обработку персональных данных и получение информационных сообщений от группы компаний СКБ Контур
            </label>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={!isFormValid() || loading}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium
              ${isFormValid() && !loading
                ? 'bg-gray-900 hover:bg-gray-800'
                : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            {loading ? 'Подождите...' : 'Продолжить'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Войти в учетную запись
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}