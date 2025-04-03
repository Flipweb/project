import React, { useState, useEffect } from 'react';
import { User, Shield, Award, Package, FileText, ShoppingBag, X, Plus, Copy, HelpCircle, Check, Pencil, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UserProfile as IUserProfile, updateProfile } from '../../lib/profile';
import { getCountries, getCountryCallingCode, parsePhoneNumber, AsYouType } from 'libphonenumber-js';
import { CountryCode } from 'libphonenumber-js/types';
import { useTranslation } from 'react-i18next';
import { Header } from '../Header';

interface EditableFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  isLoading?: boolean;
  error?: string;
  placeholder: string;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  validate?: (value: string) => string | null;
  type?: string;
  countryCode?: string;
  onCountryChange?: (code: string) => void;
}

const countries = getCountries().map(code => ({
  code,
  name: new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) || code,
  dialCode: `+${getCountryCallingCode(code as CountryCode)}`
})).sort((a, b) => {
  if (a.code === 'RU') return -1;
  if (b.code === 'RU') return 1;
  return a.name.localeCompare(b.name);
});

function EditableField({
  label,
  value,
  isEditing,
  isLoading,
  error,
  placeholder,
  onEdit,
  onChange,
  onSave,
  onCancel,
  validate,
  type = 'text',
  countryCode = 'RU',
  onCountryChange
}: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);
  const [formatter] = useState(() => new AsYouType(countryCode as CountryCode));

  useEffect(() => {
    setLocalValue(value);
    setLocalError(null);
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (type === 'tel') {
      formatter.reset();
      const formattedValue = formatter.input(newValue);
      setLocalValue(formattedValue);
      
      if (validate) {
        const error = validate(formattedValue);
        setLocalError(error);
      }
      
      onChange(formattedValue);
      return;
    }

    setLocalValue(newValue);
    
    if (validate) {
      const error = validate(newValue);
      setLocalError(error);
    }
    
    onChange(newValue);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    onCountryChange?.(newCountryCode);
    
    // Reset the phone number when changing country
    setLocalValue('');
    onChange('');
    setLocalError(null);
  };

  const handleSave = () => {
    if (!localValue.trim()) {
      setLocalError('Поле не может быть пустым');
      return;
    }

    if (validate) {
      const error = validate(localValue);
      if (error) {
        setLocalError(error);
        return;
      }
    }
    onSave();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {isEditing ? (
          <div className="space-y-2">
            {type === 'tel' && (
              <select
                value={countryCode}
                onChange={handleCountryChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={isLoading}
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.dialCode})
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center space-x-2">
              <input
                type={type}
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  localError ? 'border-red-500' : ''
                }`}
                disabled={isLoading}
              />
              <button
                onClick={handleSave}
                disabled={isLoading || !!localError || !localValue.trim()}
                className="p-2 text-green-600 hover:text-green-700 disabled:text-gray-400"
                title="Сохранить"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-700 disabled:text-gray-400"
                title="Отменить"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-900">
              {value || <span className="text-gray-400">{placeholder}</span>}
            </span>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Редактировать"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      {(error || localError) && (
        <p className="mt-1 text-sm text-red-500">{error || localError}</p>
      )}
    </div>
  );
}

export function UserProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'profile']);
  const [showPromotion, setShowPromotion] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [profile, setProfile] = useState<IUserProfile>({
    email: '',
    name: '',
    phone: '',
    countryCode: 'RU'
  });

  const [editing, setEditing] = useState({
    name: false,
    phone: false
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          email: user.email || '',
          name: user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          countryCode: user.user_metadata?.countryCode || 'RU'
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Ошибка загрузки профиля');
    }
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    try {
      const phoneNumber = parsePhoneNumber(phone, profile.countryCode as CountryCode);
      return phoneNumber.isValid() ? null : 'Неверный формат номера телефона';
    } catch {
      return 'Неверный формат номера телефона';
    }
  };

  const handleSave = async (field: 'name' | 'phone') => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не найден');

      const updatedProfile = await updateProfile(user.id, {
        [field]: profile[field],
        ...(field === 'phone' && { countryCode: profile.countryCode })
      });

      setProfile(updatedProfile);
      setEditing({ ...editing, [field]: false });
    } catch (err: any) {
      setError(err.message);
      console.error('Error saving profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: User, label: t('navigation.profile'), active: true },
    { icon: Shield, label: t('navigation.security') },
    { icon: Award, label: t('navigation.certificates') },
    { icon: Package, label: t('navigation.services') },
    { icon: FileText, label: t('navigation.documents') },
    { icon: ShoppingBag, label: t('navigation.orders') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Menu Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
            <span className="font-medium">{t('navigation.profile')}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <nav className={`${
            showMobileMenu ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 lg:flex-shrink-0 mb-6 lg:mb-0`}>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg
                      ${item.active 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Promotion Banner */}
            {showPromotion && (
              <div className="bg-white p-4 sm:p-6 rounded-lg border relative">
                <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGRUJFQiIvPgo8cGF0aCBkPSJNMzIgMjRDMzIgMjguNDE4MyAyOC40MTgzIDMyIDI0IDMyQzE5LjU4MTcgMzIgMTYgMjguNDE4MyAxNiAyNEMxNiAxOS41ODE3IDE5LjU4MTcgMTYgMjQgMTZDMjguNDE4MyAxNiAzMiAxOS41ODE3IDMyIDI0WiIgZmlsbD0iI0ZGNzU3NSIvPgo8L3N2Zz4K"
                      alt=""
                      className="h-12 w-12"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{t('profile:promotion.title')}</h3>
                    <p className="text-gray-600">{t('profile:promotion.description')}</p>
                  </div>
                  <div className="flex flex-col sm:items-end space-y-2">
                    <button
                      onClick={() => setShowPromotion(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <button className="w-full sm:w-auto bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                      {t('profile:promotion.action')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Info Form */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-6">{t('profile:title')}</h2>
              
              <div className="space-y-6">
                <EditableField
                  label={t('profile:fields.name.label')}
                  value={profile.name || ''}
                  isEditing={editing.name}
                  isLoading={loading}
                  placeholder={t('profile:fields.name.placeholder')}
                  onEdit={() => setEditing({ ...editing, name: true })}
                  onChange={(value) => setProfile({ ...profile, name: value })}
                  onSave={() => handleSave('name')}
                  onCancel={() => {
                    setEditing({ ...editing, name: false });
                    loadProfile();
                  }}
                />

                <EditableField
                  label={t('profile:fields.phone.label')}
                  value={profile.phone || ''}
                  isEditing={editing.phone}
                  isLoading={loading}
                  error={error}
                  placeholder={t('profile:fields.phone.placeholder')}
                  onEdit={() => setEditing({ ...editing, phone: true })}
                  onChange={(value) => setProfile({ ...profile, phone: value })}
                  onSave={() => handleSave('phone')}
                  onCancel={() => {
                    setEditing({ ...editing, phone: false });
                    loadProfile();
                  }}
                  validate={validatePhone}
                  type="tel"
                  countryCode={profile.countryCode}
                  onCountryChange={(code) => setProfile({ ...profile, countryCode: code })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile:fields.email.label')}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(profile.email)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title={t('actions.copy')}
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Section */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{t('profile:certificates.title')}</h2>
                <button className="flex items-center text-gray-600 hover:text-gray-900">
                  <Plus className="h-5 w-5 mr-2" />
                  {t('profile:certificates.add')}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-red-400 mb-4">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 32L12 20M24 32L36 20M24 32V8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">
                  {t('profile:certificates.empty.title')}
                </p>
                <p className="text-gray-600">
                  {t('profile:certificates.empty.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6">
            {/* Bonus Program */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">{t('profile:bonus.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('profile:bonus.description')}
              </p>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <span className="mr-2">{t('profile:bonus.action')}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            {/* Referral Program */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">{t('profile:referral.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('profile:referral.description')}
              </p>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <span className="mr-2">{t('profile:referral.action')}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            {/* Certificates Info */}
            <div className="bg-white p-4 sm:p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {t('profile:info.title')}
                </h3>
                <HelpCircle className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                {t('profile:info.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center">
          <User className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-gray-600 truncate">
            {profile.name ? `${profile.name} (${profile.email})` : profile.email}
          </span>
          <HelpCircle className="h-5 w-5 text-gray-400 ml-auto cursor-pointer" />
        </div>
      </div>
    </div>
  );
}