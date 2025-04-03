import React, { useState, useEffect } from 'react';
import { User, Shield, Award, Package, FileText, ShoppingBag, X, Plus, Copy, HelpCircle, Check, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UserProfile as IUserProfile, updateProfile } from '../../lib/profile';

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
}

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
  validate
}: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (validate) {
      const error = validate(newValue);
      setLocalError(error);
    }
    
    onChange(newValue);
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
          <div className="flex items-center space-x-2">
            <input
              type="text"
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
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-700 disabled:text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-900">
              {value || <span className="text-gray-400">{placeholder}</span>}
            </span>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600"
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
  const [showPromotion, setShowPromotion] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<IUserProfile>({
    email: '',
    name: '',
    phone: ''
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
          phone: user.user_metadata?.phone || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    const phoneRegex = /^\+7[0-9]{10}$/;
    return phoneRegex.test(phone) ? null : 'Номер телефона должен быть в формате +7XXXXXXXXXX';
  };

  const handleSave = async (field: 'name' | 'phone') => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const updatedProfile = await updateProfile(user.id, {
        [field]: profile[field]
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
    { icon: User, label: 'Личные данные', active: true },
    { icon: Shield, label: 'Безопасность' },
    { icon: Award, label: 'Сертификаты' },
    { icon: Package, label: 'Сервисы' },
    { icon: FileText, label: 'Документы' },
    { icon: ShoppingBag, label: 'Заказы' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Контур</h1>
            <span className="text-red-500">Кабинет клиента</span>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
            Выйти
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-64 flex-shrink-0">
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
              <div className="bg-white p-4 rounded-lg border relative">
                <button
                  onClick={() => setShowPromotion(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0ZGRUJFQiIvPgo8cGF0aCBkPSJNMzIgMjRDMzIgMjguNDE4MyAyOC40MTgzIDMyIDI0IDMyQzE5LjU4MTcgMzIgMTYgMjguNDE4MyAxNiAyNEMxNiAxOS41ODE3IDE5LjU4MTcgMTYgMjQgMTZDMjguNDE4MyAxNiAzMiAxOS41ODE3IDMyIDI0WiIgZmlsbD0iI0ZGNzU3NSIvPgo8L3N2Zz4K"
                      alt=""
                      className="h-12 w-12"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">3 продукта Контура по подписке</h3>
                    <p className="text-gray-600">Подключите прямо сейчас, от 1200 рублей в месяц</p>
                  </div>
                  <button className="ml-auto bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                    Подключить
                  </button>
                </div>
              </div>
            )}

            {/* Personal Info Form */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-6">Личные данные</h2>
              
              <div className="space-y-6">
                <EditableField
                  label="Как вас зовут?"
                  value={profile.name || ''}
                  isEditing={editing.name}
                  isLoading={loading}
                  placeholder="Будем знать, как к вам обращаться"
                  onEdit={() => setEditing({ ...editing, name: true })}
                  onChange={(value) => setProfile({ ...profile, name: value })}
                  onSave={() => handleSave('name')}
                  onCancel={() => {
                    setEditing({ ...editing, name: false });
                    loadProfile();
                  }}
                />

                <EditableField
                  label="Телефон"
                  value={profile.phone || ''}
                  isEditing={editing.phone}
                  isLoading={loading}
                  error={error}
                  placeholder="Для входа и получения уведомлений"
                  onEdit={() => setEditing({ ...editing, phone: true })}
                  onChange={(value) => setProfile({ ...profile, phone: value })}
                  onSave={() => handleSave('phone')}
                  onCancel={() => {
                    setEditing({ ...editing, phone: false });
                    loadProfile();
                  }}
                  validate={validatePhone}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Почта
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
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Section */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Сертификаты для входа в Контур</h2>
                <button className="flex items-center text-gray-600 hover:text-gray-900">
                  <Plus className="h-5 w-5 mr-2" />
                  Добавить
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-red-400 mb-4">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 32L12 20M24 32L36 20M24 32V8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">
                  У вас есть сертификат? Можете использовать
                </p>
                <p className="text-gray-600">
                  его для входа в сервисы Контура
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* Bonus Program */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Бонусная программа</h3>
              <p className="text-sm text-gray-600 mb-4">
                Зарегистрируйтесь и получайте подарки за использование сервисов Контура
              </p>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <span className="mr-2">Подробнее</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            {/* Referral Program */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Реферальная программа</h3>
              <p className="text-sm text-gray-600 mb-4">
                Рекомендуйте Контур и получайте вознаграждение
              </p>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <span className="mr-2">Подробнее</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            {/* Certificates Info */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  Все ваши сертификаты на одной вкладке
                </h3>
                <HelpCircle className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Теперь на вкладке Сертификаты находится вся информация о сертификатах электронной подписи и статусы заявок
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center">
          <User className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-gray-600">{profile.email}</span>
          <HelpCircle className="h-5 w-5 text-gray-400 ml-auto cursor-pointer" />
        </div>
      </div>
    </div>
  );
}