import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url!, key!) : null

export type Status = '已投递' | '笔试' | '面试' | 'Offer' | '已结束'
export type EventType = '笔试' | '技术面' | 'HR面' | '综合面' | '其他'
export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  status: Status
  applied_at: string
  job_url: string | null
  platform: string | null
  password_ciphertext: string | null
  password_iv: string | null
  password_salt: string | null
  notes: string | null
  created_at: string
}
export interface Event {
  id: string
  user_id: string
  application_id: string
  type: EventType
  starts_at: string
  location: string | null
  notes: string | null
  completed: boolean
  created_at: string
}

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0))
async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function encryptPassword(password: string, passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await deriveKey(passphrase, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(password))
  return { password_ciphertext: bytesToBase64(new Uint8Array(encrypted)), password_iv: bytesToBase64(iv), password_salt: bytesToBase64(salt) }
}
export async function decryptPassword(record: Application, passphrase: string) {
  if (!record.password_ciphertext || !record.password_iv || !record.password_salt) return ''
  const key = await deriveKey(passphrase, base64ToBytes(record.password_salt))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(record.password_iv) }, key, base64ToBytes(record.password_ciphertext))
  return new TextDecoder().decode(plain)
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(date))
}
export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}
export function safeUrl(value: string | null) {
  if (!value) return undefined
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}
