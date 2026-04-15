import { green, blue, orange, red, purple } from '@mui/material/colors'

// ─── 型定義 ──────────────────────────────────────────────────

export interface AclPermission {
  C: boolean
  R: boolean
  U: boolean
  D: boolean
  E: boolean
}

export interface AclEntry {
  group: string
  permissions: AclPermission
}

export interface GroupOption {
  value: string
  label: string
  isSpecial: boolean
}

export interface CustomField {
  parentKey: string
  fieldKey: string
  fullKey: string
  type: string
  label: string
  value: string
  error?: string
}

export interface BrowserEntry {
  key: string
  name: string
  entry: any
}

// ─── 定数 ───────────────────────────────────────────────────

export const SPECIAL_GROUPS: GroupOption[] = [
  { value: '+', label: 'ログイン可能な全ユーザ', isSpecial: true },
  { value: '*', label: '全てのユーザ（未ログイン含む）', isSpecial: true }
]

export const DEFAULT_GROUP_LABELS: Record<string, string> = {
  '/_group/$admin': 'サービス管理者',
  '/_group/$content': 'コンテンツ管理者',
  '/_group/$useradmin': 'ユーザ管理者'
}

export const PERMISSION_DEFS: {
  key: keyof AclPermission
  short: string
  label: string
  color: string
}[] = [
  { key: 'C', short: 'C', label: '作成', color: green[600] },
  { key: 'R', short: 'R', label: '読取', color: blue[600] },
  { key: 'U', short: 'U', label: '更新', color: orange[700] },
  { key: 'D', short: 'D', label: '削除', color: red[600] },
  { key: 'E', short: 'E', label: 'サービス経由', color: purple[600] }
]

export const DEFAULT_ACL: AclEntry[] = [
  { group: '/_group/$admin', permissions: { C: true, R: true, U: true, D: true, E: false } }
]

export const COMMON_SCHEMA_FIELDS = [
  { path: 'title', type: 'string', label: 'タイトル' },
  { path: 'subtitle', type: 'string', label: 'サブタイトル' },
  { path: 'summary', type: 'string', label: 'サマリ' },
  { path: 'rights', type: 'string', label: 'ライツ' },
  { path: 'content', type: 'string', label: 'コンテンツ' }
] as const

export const COMMON_FIELDS = new Set(['title', 'subtitle', 'summary', 'rights', 'content'])
export const COMMON_FIELD_ORDER = ['title', 'subtitle', 'summary', 'rights', 'content']

export const PAGE_SIZE = 50

// ─── ユーティリティ ──────────────────────────────────────────

export const emptyPermission = (): AclPermission => ({
  C: false,
  R: false,
  U: false,
  D: false,
  E: false
})

export function parseContributorUri(uri: string): AclEntry | null {
  const prefix = 'urn:vte.cx:acl:'
  if (!uri.startsWith(prefix)) return null
  const rest = uri.slice(prefix.length)
  const commaIdx = rest.lastIndexOf(',')
  if (commaIdx === -1) return null
  const group = rest.slice(0, commaIdx)
  const permStr = rest.slice(commaIdx + 1)
  const permissions: AclPermission = { C: false, R: false, U: false, D: false, E: false }
  for (const ch of permStr) {
    if (ch === 'C') permissions.C = true
    else if (ch === 'R') permissions.R = true
    else if (ch === 'U') permissions.U = true
    else if (ch === 'D') permissions.D = true
    else if (ch === 'E') permissions.E = true
  }
  return { group, permissions }
}

export function buildContributorUri(entry: AclEntry): string {
  const permStr = (['C', 'R', 'U', 'D', 'E'] as (keyof AclPermission)[])
    .filter(k => entry.permissions[k])
    .join('')
  return `urn:vte.cx:acl:${entry.group},${permStr}`
}

export function resolveGroupLabel(value: string): string {
  if (DEFAULT_GROUP_LABELS[value]) return DEFAULT_GROUP_LABELS[value]
  if (value === '+') return 'ログイン可能な全ユーザ'
  if (value === '*') return '全てのユーザ（未ログイン含む）'
  return value.replace(/^\/_group\//, '')
}

export function permissionSummary(p: AclPermission): string {
  return (['C', 'R', 'U', 'D', 'E'] as (keyof AclPermission)[]).filter(k => p[k]).join('')
}

// ─── スキーマユーティリティ ────────────────────────────────────

export const SCHEMA_TYPES = ['string', 'int', 'long', 'float', 'double', 'boolean', 'date'] as const
export type SchemaType = (typeof SCHEMA_TYPES)[number]

export const validateSchemaValue = (value: string, type: string): string | undefined => {
  if (value === '') return undefined
  switch (type as SchemaType) {
    case 'int':
    case 'long':
      if (!/^-?\d+$/.test(value.trim())) return '整数値を入力してください'
      break
    case 'float':
    case 'double':
      if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim())) return '数値を入力してください'
      break
    case 'boolean':
      if (value !== 'true' && value !== 'false') return 'true または false を入力してください'
      break
    case 'date':
      if (isNaN(Date.parse(value))) return '有効な日時を入力してください'
      break
  }
  return undefined
}

export const parseSchemaValue = (value: string, type: string): any => {
  if (value === '') return value
  switch (type as SchemaType) {
    case 'int':
    case 'long':
      return parseInt(value, 10)
    case 'float':
    case 'double':
      return parseFloat(value)
    case 'boolean':
      return value === 'true'
    case 'date':
      return value
    default:
      return value
  }
}

export const sortSchemaGroups = <T extends unknown>(entries: [string, T][]): [string, T][] =>
  [...entries].sort(([a], [b]) =>
    a === '__root__' ? -1 : b === '__root__' ? 1 : a.localeCompare(b)
  )

export const sortCardFields = <T extends { fullKey?: string }>(
  fields: T[],
  isRoot: boolean
): T[] => {
  if (!isRoot) return [...fields].sort((a, b) => (a.fullKey ?? '').localeCompare(b.fullKey ?? ''))
  const common = fields
    .filter(f => COMMON_FIELD_ORDER.includes(f.fullKey ?? ''))
    .sort(
      (a, b) =>
        COMMON_FIELD_ORDER.indexOf(a.fullKey ?? '') - COMMON_FIELD_ORDER.indexOf(b.fullKey ?? '')
    )
  const custom = fields
    .filter(f => !COMMON_FIELD_ORDER.includes(f.fullKey ?? ''))
    .sort((a, b) => (a.fullKey ?? '').localeCompare(b.fullKey ?? ''))
  return [...common, ...custom]
}

// ─── URL ユーティリティ ───────────────────────────────────────

export function getHashParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, '')
  const qIdx = hash.indexOf('?')
  return new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : '')
}

export function setHashParams(updates: Record<string, string | null>, replace = false) {
  const params = getHashParams()
  Object.entries(updates).forEach(([k, v]) => (v === null ? params.delete(k) : params.set(k, v)))
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0]
  const newHash = `${hashPath}?${params.toString()}`
  if (replace) window.history.replaceState(null, '', `#${newHash}`)
  else window.history.pushState(null, '', `#${newHash}`)
}

export function getBrowserParams(): { path: string; page: number } {
  const p = getHashParams()
  return { path: p.get('path') ?? '/', page: parseInt(p.get('page') ?? '1', 10) }
}

export function setBrowserParams(path: string, page: number, replace = false) {
  setHashParams({ path, page: String(page) }, replace)
}

export function buildBreadcrumbs(path: string): { label: string; path: string }[] {
  if (path === '/') return [{ label: 'ルート', path: '/' }]
  const parts = path.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = [{ label: 'ルート', path: '/' }]
  parts.forEach((p, i) => crumbs.push({ label: p, path: '/' + parts.slice(0, i + 1).join('/') }))
  return crumbs
}
