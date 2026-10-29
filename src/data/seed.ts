import type { Language } from '../types';
import * as en from './seed.en';
import * as zh from './seed.zh';

export type SeedBundle = typeof en;

export function seedFor(language: Language): SeedBundle {
  return language === 'zh' ? zh : en;
}
