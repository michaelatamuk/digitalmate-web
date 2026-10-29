import type { A2uiComponent } from '../../types';

export interface A2uiCreateSurface {
  surfaceId: string;
  root: string;
  title?: string;
  subtitle?: string;
  status?: string;
}

export interface A2uiUpdateComponents {
  surfaceId: string;
  components: A2uiComponent[];
}

export interface A2uiUpdateDataModel {
  surfaceId: string;
  path: string;
  value: unknown;
}

export interface A2uiDeleteSurface {
  surfaceId: string;
}

export interface A2uiEnvelope {
  version?: string;
  createSurface?: A2uiCreateSurface;
  updateComponents?: A2uiUpdateComponents;
  updateDataModel?: A2uiUpdateDataModel;
  deleteSurface?: A2uiDeleteSurface;
}

export interface A2uiParseError {
  line: number;
  message: string;
}

export interface A2uiParseResult {
  envelopes: A2uiEnvelope[];
  errors: A2uiParseError[];
}
