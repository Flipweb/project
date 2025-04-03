import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">{t('app.name')}</h1>
            <span className="hidden sm:block text-red-500 ml-8">{t('app.description')}</span>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-gray-500 hover:text-gray-600"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">{t('actions.logout')}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="lg:hidden mt-4 pb-2 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-4">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t('actions.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}