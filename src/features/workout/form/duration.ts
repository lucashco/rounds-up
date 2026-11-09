import { renderMessage } from '../../../i18n/core';
import type { Message } from '../../../i18n/core';

/** Legacy plain values are total seconds; edited values use minutes:seconds. */
export function durationParts(value: string): { minutes: string; seconds: string } {
  if (value.includes(':')) {
    const [minutes = '', seconds = ''] = value.split(':');
    return { minutes, seconds };
  }
  if (value.trim() === '') return { minutes: '', seconds: '' };
  const total = Number(value);
  if (!Number.isFinite(total) || total < 0) return { minutes: '', seconds: value };
  const minutes = Math.floor(total / 60);
  return { minutes: String(minutes), seconds: String(Number((total - minutes * 60).toFixed(6))) };
}

export function durationSeconds(value: string): number {
  if (!value.includes(':')) return value.trim() === '' ? NaN : Number(value);
  const parts = value.split(':');
  if (parts.length !== 2) return NaN;
  const minutes = parts[0]!.trim() === '' ? 0 : Number(parts[0]);
  const seconds = parts[1]!.trim() === '' ? 0 : Number(parts[1]);
  if (!Number.isSafeInteger(minutes) || minutes < 0 || !Number.isFinite(seconds) || seconds < 0 || seconds > 59) return NaN;
  return minutes * 60 + seconds;
}

export function durationInputIssue(value: string, allowZero: boolean): Message | null {
  const parts = durationParts(value);
  const seconds = value.trim() === ''
    ? allowZero ? 0 : NaN
    : durationSeconds(value.includes(':') ? value : `${parts.minutes}:${parts.seconds}`);
  if (!Number.isFinite(seconds) || seconds < 0) return { key: 'invalidDuration', params: {} };
  if (seconds === 0 && !allowZero) return { key: 'positiveDuration', params: {} };
  return null;
}

/** Compatibility helper for form conversion and existing consumers. */
export function durationInputError(value: string, allowZero: boolean): string | null {
  const issue = durationInputIssue(value, allowZero);
  return issue ? renderMessage('pt-BR', issue) : null;
}
