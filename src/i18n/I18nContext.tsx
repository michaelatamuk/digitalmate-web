import { createContext, useContext } from 'react';
import type { Language } from '../types';

export interface I18nValue {
  lang: Language;
  setLang: (language: Language) => void;
  tr: (english: string, chinese: string) => string;
  locale: string;
}

const defaultValue: I18nValue = {
  lang: 'en',
  setLang: () => {},
  tr: (english: string) => english,
  locale: 'en-US'
};

export const I18nContext = createContext<I18nValue>(defaultValue);

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
