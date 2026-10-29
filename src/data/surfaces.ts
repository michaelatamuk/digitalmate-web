import type { Language } from '../types';
import * as en from './surfaces.en';
import * as zh from './surfaces.zh';

export type SurfaceBundle = typeof en;

export function surfacesFor(language: Language): SurfaceBundle {
  return language === 'zh' ? zh : en;
}
