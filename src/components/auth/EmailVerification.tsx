import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getEmailStatus } from '../../lib/emailMonitoring';

export function EmailVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const email = location.state?.email;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (email) {
      checkEmailStatus();
    }
  }, [email]);

  const checkEmailStatus = async () => {
    try {
      const status = await getEmailStatus(email);
      if (status) {
        setEmailStatus(`${status.type} - ${status.status}`);
      }
    } catch (error) {
      console.error('Error checking email status:', error);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0 || !email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) throw error;
      
      setCountdown(60);
      await checkEmailStatus();
    } catch (err) {
      console.error('Error resending email:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-1">Контур</h1>
        <h2 className="text-gray-600 mb-8">Регистрация</h2>

        <div className="flex justify-center mb-6">
          <Send className="h-16 w-16 text-red-500" />
        </div>

        <h3 className="text-xl font-semibold mb-4">
          Для завершения регистрации перейдите по ссылке из письма
        </h3>

        <p className="text-gray-600 mb-2">
          Письмо отправили на почту<br />
          <span className="font-medium">{email}</span>
        </p>

        {emailStatus && (
          <p className="text-sm text-gray-500 mb-4">
            Статус письма: {emailStatus}
          </p>
        )}

        <p className="text-gray-600 mb-6">
          Если письма нет, проверьте папку «Спам»
        </p>

        <button
          onClick={handleResendEmail}
          disabled={countdown > 0 || loading}
          className={`w-full py-2 px-4 rounded-lg text-gray-600 font-medium mb-4
            ${countdown > 0 || loading
              ? 'bg-gray-100 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200'
            }`}
        >
          {loading
            ? 'Отправка...'
            : countdown > 0
              ? `Выслать письмо повторно через ${countdown}`
              : 'Выслать письмо повторно'
          }
        </button>

        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Изменить почту
        </button>
      </div>
    </div>
  );
}