import type { Language } from '../types';

interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => RecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isVoiceRecognitionSupported(): boolean {
  return recognitionConstructor() !== null;
}

export interface VoiceSession {
  stop: () => void;
  abort: () => void;
}

export function startVoiceRecognition(options: {
  lang: Language;
  onTranscript: (text: string, final: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): VoiceSession | null {
  const Constructor = recognitionConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = options.lang === 'zh' ? 'zh-CN' : 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = event => {
    let transcript = '';
    let final = false;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      transcript += result[0]?.transcript ?? '';
      if (result.isFinal) final = true;
    }
    if (transcript) options.onTranscript(transcript, final);
  };
  recognition.onerror = event => {
    options.onError?.(event.error);
  };
  recognition.onend = () => {
    options.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  let active = true;
  return {
    stop: () => {
      if (!active) return;
      active = false;
      recognition.stop();
    },
    abort: () => {
      if (!active) return;
      active = false;
      recognition.abort();
    }
  };
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakText(text: string, lang: Language): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  const clean = text.replace(/[#*_`>\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}
