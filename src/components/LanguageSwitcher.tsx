import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
  shortName: string;
}

const languages: Language[] = [
  {
    code: 'ru',
    name: 'Русский',
    shortName: 'RU',
    flag: 'https://flagcdn.com/w20/ru.png'
  },
  {
    code: 'en',
    name: 'English',
    shortName: 'EN',
    flag: 'https://flagcdn.com/w20/gb.png'
  }
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
      >
        <img
          src={currentLanguage.flag}
          alt={currentLanguage.name}
          className="w-4 h-4 rounded-sm object-cover"
        />
        <span className="text-sm font-medium text-gray-700">{currentLanguage.shortName}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-50 space-x-3"
            >
              <img
                src={language.flag}
                alt={language.name}
                className="w-4 h-4 rounded-sm object-cover"
              />
              <span className="text-sm text-gray-700">{language.name}</span>
              {language.code === i18n.language && (
                <Check className="h-4 w-4 text-red-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}