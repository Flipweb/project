import { supabase } from './supabase';

export interface AuthError {
  message: string;
  status?: number;
}

const RESET_COOLDOWN_KEY = 'passwordResetLastAttempt';
const RESET_COOLDOWN = 60000; // 60 seconds in milliseconds

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    // Check if enough time has passed since the last attempt
    const lastAttempt = parseInt(localStorage.getItem(RESET_COOLDOWN_KEY) || '0');
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < RESET_COOLDOWN) {
      const remainingSeconds = Math.ceil((RESET_COOLDOWN - timeSinceLastAttempt) / 1000);
      return {
        success: false,
        error: {
          message: `Пожалуйста, подождите ${remainingSeconds} секунд перед повторной попыткой`,
          status: 429
        }
      };
    }

    // Update last attempt timestamp
    localStorage.setItem(RESET_COOLDOWN_KEY, now.toString());

    // Get the current origin
    const origin = import.meta.env.VITE_APP_URL || window.location.origin;

    // Generate password reset link with correct redirect URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error: {
            message: 'Слишком много попыток. Пожалуйста, подождите минуту перед повторной попыткой.',
            status: 429
          }
        };
      }

      if (error.message.includes('Email not found')) {
        return {
          success: false,
          error: {
            message: 'Этот email не зарегистрирован. Пожалуйста, зарегистрируйтесь или используйте другой email.',
            status: 404
          }
        };
      }

      return {
        success: false,
        error: {
          message: 'Произошла ошибка при отправке письма для восстановления пароля',
          status: 500
        }
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      error: {
        message: 'Произошла ошибка при отправке письма для восстановления пароля. Пожалуйста, попробуйте позже.',
        status: 500
      }
    };
  }
}

export async function resetPassword(newPassword: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message === 'New password should be different from the old password'
            ? 'Новый пароль должен отличаться от старого'
            : 'Произошла ошибка при обновлении пароля. Пожалуйста, попробуйте позже.',
          status: 400
        }
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: {
        message: 'Произошла ошибка при обновлении пароля. Пожалуйста, попробуйте позже.',
        status: 500
      }
    };
  }
}