import React from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material'
import { Search, Close, Add, ChevronRight } from '@mui/icons-material'
import { grey, blue, teal } from '@mui/material/colors'
import { fetcher } from '../../../../../../utils/fetcher'
import VtecxApp from '../../../../../../typings'
import { COMMON_SCHEMA_FIELDS } from '../../types'
import dayjs from 'dayjs'

// ─── 型定義 ──────────────────────────────────────────────────

// 検索オペレータ
type SearchOp = 'eq' | 'fm' | 'bm' | 'lt' | 'le' | 'gt' | 'ge' | 'ne' | 'rg'

interface SearchCondition {
  id: string
  field: string
  fieldType: string
  op: SearchOp
  value: string
}

// 前回の検索状態を保持する型
export interface SearchState {
  searchPath: string
  conditions: SearchCondition[]
}

// ─── 定数 ────────────────────────────────────────────────────

const OP_LABELS: Record<SearchOp, string> = {
  eq: '完全一致 (=)',
  fm: '前方一致',
  bm: '後方一致',
  lt: '未満 (<)',
  le: '以下 (<=)',
  gt: 'より大きい (>)',
  ge: '以上 (>=)',
  ne: '等しくない (!=)',
  rg: '正規表現'
}

// 型ごとに使えるオペレータ
const OPS_FOR_TYPE = (type: string): SearchOp[] => {
  switch (type) {
    case 'int':
    case 'long':
    case 'float':
    case 'double':
      return ['eq', 'lt', 'le', 'gt', 'ge', 'ne']
    case 'boolean':
      return ['eq', 'ne']
    case 'date':
      return ['eq', 'lt', 'le', 'gt', 'ge', 'ne']
    default: // string
      return ['eq', 'fm', 'bm', 'lt', 'le', 'gt', 'ge', 'ne', 'rg']
  }
}

// SearchCondition → クエリパラメータ文字列に変換
// 完全一致: {field}={value}
// それ以外: {field}=-{op}-{value} → クエリパラメータは {field}={-op-value}
// SearchCondition → クエリパラメータ文字列に変換
// eq:  {field}={value}
// 他:  {field}-{op}-{value}  (例: name-fm-田中)
function conditionToParam(c: SearchCondition): string {
  if (!c.field || !c.value) return ''
  const enc = encodeURIComponent(c.value)
  if (c.op === 'eq') return `${c.field}=${enc}`
  return `${c.field}-${c.op}-${enc}`
}

// ─── スキーマフィールド選択ドロップダウン（SearchModal専用） ──

const SchemaFieldPicker: React.FC<{
  onPick: (field: { path: string; type: string }) => void
  externalSchemaList?: { path: string; type: string; indent: number }[]
  initialField?: string
}> = ({ onPick, externalSchemaList, initialField }) => {
  const [query, setQuery] = React.useState(initialField ?? '')
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const listRef = React.useRef<HTMLUListElement>(null)

  React.useEffect(() => {
    setQuery(initialField ?? '')
    setActiveIdx(-1)
  }, [initialField])
  const [schemaList, setSchemaList] = React.useState<
    { path: string; type: string; indent: number }[]
  >(externalSchemaList ?? [])
  const [results, setResults] = React.useState<{ path: string; type: string; indent: number }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [dropOpen, setDropOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (externalSchemaList) {
      setSchemaList(externalSchemaList)
      return
    }
    setLoading(true)
    fetcher('/d/_settings/template?e', 'get')
      .then(res => {
        const text: string = res?.data?.content?.______text ?? ''
        const lines = text.split('\n').filter((l: string) => l.trim())
        const stack: { indent: number; path: string }[] = []
        const parsed: { path: string; type: string; indent: number }[] = []
        lines.forEach((line: string) => {
          const indent = line.match(/^ */)?.[0].length || 0
          const trimmed = line.trim()
          const name = trimmed.split(/[(!{=]/)[0]
          const typeMatch = trimmed.match(/\(([^)]+)\)/)
          const type = typeMatch ? typeMatch[1] : 'string'
          while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
          const parentPath = stack.length > 0 ? stack[stack.length - 1].path : ''
          const fullPath = parentPath ? `${parentPath}.${name}` : name
          stack.push({ indent, path: fullPath })
          // 子を持つ親（コンテナ）は除外し、末端フィールドのみ追加
          parsed.push({ path: fullPath, type, indent })
        })
        // 末端フィールドのみ（子を持たないもの）
        const leaves = parsed.filter(p => !parsed.some(q => q.path.startsWith(p.path + '.')))
        setSchemaList(leaves)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [externalSchemaList])

  const handleSearch = (val: string) => {
    setQuery(val)
    setActiveIdx(-1)
    const allFields = [
      ...COMMON_SCHEMA_FIELDS.map(f => ({ path: f.path, type: f.type as string, indent: 0 })),
      ...schemaList
    ]
    if (!val) {
      setResults(allFields)
      return
    }
    const q = val.toLowerCase()
    setResults(allFields.filter(s => s.path.toLowerCase().includes(q)).slice(0, 50))
  }

  const handleFocus = () => {
    if (!query) {
      const allFields = [
        ...COMMON_SCHEMA_FIELDS.map(f => ({ path: f.path, type: f.type as string, indent: 0 })),
        ...schemaList
      ]
      setResults(allFields)
    }
    setDropOpen(true)
  }

  const handlePick = (r: { path: string; type: string }) => {
    onPick(r)
    setQuery(r.path)
    setDropOpen(false)
    setActiveIdx(-1)
  }

  const scrollToItem = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.min(prev + 1, results.length - 1)
        scrollToItem(n)
        return n
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.max(prev - 1, 0)
        scrollToItem(n)
        return n
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < results.length) handlePick(results[activeIdx])
    } else if (e.key === 'Escape') {
      setDropOpen(false)
    }
  }

  const getDropdownStyle = () => {
    if (!containerRef.current) return {}
    const rect = containerRef.current.getBoundingClientRect()
    return { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative', flex: 1 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="フィールドを選択..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={handleFocus}
        onBlur={() =>
          setTimeout(() => {
            setDropOpen(false)
            setActiveIdx(-1)
          }, 150)
        }
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            endAdornment: loading ? (
              <CircularProgress size={14} />
            ) : (
              <Search fontSize="small" sx={{ color: grey[400] }} />
            )
          }
        }}
      />
      {dropOpen && results.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            zIndex: 1500,
            maxHeight: 240,
            overflowY: 'auto',
            border: `1px solid ${grey[200]}`,
            ...getDropdownStyle()
          }}
        >
          <List ref={listRef} dense disablePadding>
            {results.map((r, i) => (
              <ListItemButton
                key={r.path}
                selected={i === activeIdx}
                onClick={() => handlePick(r)}
                sx={{ bgcolor: i === activeIdx ? blue[50] : undefined }}
              >
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {r.path}
                    </Typography>
                  }
                  secondary={
                    r.type ? (
                      <Typography variant="caption" sx={{ color: grey[400], fontSize: '0.6rem' }}>
                        {r.type}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}

// ─── URL 入力（AliasInput 相当） ─────────────────────────────

const PathInput: React.FC<{
  value: string
  onChange: (v: string) => void
}> = ({ value, onChange }) => {
  const [candidates, setCandidates] = React.useState<string[]>([])
  const [validPaths, setValidPaths] = React.useState<Set<string>>(new Set())
  const [confirmedValues, setConfirmedValues] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [dropOpen, setDropOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputBoxRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const getDropdownStyle = () => {
    const el = inputBoxRef.current ?? containerRef.current
    if (!el) return {}
    const rect = el.getBoundingClientRect()
    return { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }

  const searchCandidates = async (path: string) => {
    setLoading(true)
    setSearched(false)
    try {
      const url = path === '/' ? `/d/?f` : `/d${path}?f`
      const res = await fetcher(url, 'get')
      const entries: any[] = Array.isArray(res.data) ? res.data : []
      const hrefs = entries
        .map(e => e.link?.find((l: any) => l.___rel === 'self')?.___href ?? '')
        .filter(h => h && !h.startsWith('/_'))
      setCandidates(hrefs)
      setValidPaths(prev => {
        const s = new Set(prev)
        hrefs.forEach(h => s.add(h))
        return s
      })
      setDropOpen(true)
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const checkExistence = React.useCallback(async (path: string) => {
    if (!path || path === '/') return
    try {
      const res = await fetcher(`/d${path}?e`, 'get')
      if (res.status === 204) return
      setValidPaths(prev => new Set(prev).add(path))
    } catch {}
  }, [])

  const handleChange = (val: string) => {
    const v = val.startsWith('/') ? val : '/' + val
    onChange(v)
    if (v.endsWith('/')) {
      searchCandidates(v)
    } else {
      setDropOpen(false)
      if (v !== '/' && !validPaths.has(v) && !confirmedValues.has(v)) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => checkExistence(v), 400)
      }
    }
  }

  const handleFocus = () => {
    if (value === '/') searchCandidates('/')
    else if (candidates.length > 0) setDropOpen(true)
    else if (value.endsWith('/')) searchCandidates(value)
  }

  const handleSelect = (href: string) => {
    onChange(href)
    setConfirmedValues(prev => new Set(prev).add(href))
    setDropOpen(false)
    setCandidates([])
    setSearched(false)
    setActiveIdx(-1)
  }

  const scrollToItem = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropOpen || candidates.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.min(prev + 1, candidates.length - 1)
        scrollToItem(n)
        return n
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.max(prev - 1, 0)
        scrollToItem(n)
        return n
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < candidates.length) handleSelect(candidates[activeIdx])
    } else if (e.key === 'Escape') {
      setDropOpen(false)
    }
  }

  return (
    <Box ref={containerRef}>
      <Box flex={1} ref={inputBoxRef} sx={{ position: 'relative' }}>
        <TextField
          size="small"
          fullWidth
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={() =>
            setTimeout(() => {
              setDropOpen(false)
              setActiveIdx(-1)
            }, 150)
          }
          onKeyDown={handleKeyDown}
          slotProps={{
            input: { endAdornment: loading ? <CircularProgress size={14} /> : undefined }
          }}
        />
      </Box>
      {dropOpen && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            zIndex: 1500,
            maxHeight: 240,
            overflowY: 'auto',
            border: `1px solid ${grey[200]}`,
            ...getDropdownStyle()
          }}
        >
          <List ref={listRef} dense disablePadding>
            {candidates.length === 0 && searched ? (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" color={grey[400]}>
                  候補がありません
                </Typography>
              </Box>
            ) : (
              candidates.map((href, i) => (
                <ListItemButton
                  key={href}
                  selected={i === activeIdx}
                  onClick={() => handleSelect(href)}
                  sx={{ bgcolor: i === activeIdx ? blue[50] : undefined }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {href}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>
      )}
    </Box>
  )
}

// ─── 検索モーダル本体 ─────────────────────────────────────────

export const SearchModal: React.FC<{
  open: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  initialState?: SearchState
  onStateChange?: (state: SearchState) => void
}> = ({ open, onClose, onNavigate, initialState, onStateChange }) => {
  const [searchPath, setSearchPath] = React.useState(initialState?.searchPath ?? '/')
  const [conditions, setConditions] = React.useState<SearchCondition[]>(
    initialState?.conditions ?? []
  )
  const [schemaList, setSchemaList] = React.useState<
    { path: string; type: string; indent: number }[]
  >([])
  const [results, setResults] = React.useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()

  // 開いたとき初期状態を復元
  React.useEffect(() => {
    if (!open) return
    if (initialState) {
      setSearchPath(initialState.searchPath)
      setConditions(initialState.conditions)
    }
    setResults([])
    setSearched(false)
    setError(undefined)
  }, [open])

  // スキーマ一覧をフェッチ（末端フィールドのみ）
  React.useEffect(() => {
    if (!open || schemaList.length > 0) return
    fetcher('/d/_settings/template?e', 'get')
      .then(res => {
        const text: string = res?.data?.content?.______text ?? ''
        const lines = text.split('\n').filter((l: string) => l.trim())
        const stack: { indent: number; path: string }[] = []
        const parsed: { path: string; type: string; indent: number }[] = []
        lines.forEach((line: string) => {
          const indent = line.match(/^ */)?.[0].length || 0
          const trimmed = line.trim()
          const name = trimmed.split(/[(!{=]/)[0]
          const typeMatch = trimmed.match(/\(([^)]+)\)/)
          const type = typeMatch ? typeMatch[1] : 'string'
          while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
          const parentPath = stack.length > 0 ? stack[stack.length - 1].path : ''
          const fullPath = parentPath ? `${parentPath}.${name}` : name
          stack.push({ indent, path: fullPath })
          parsed.push({ path: fullPath, type, indent })
        })
        const leaves = parsed.filter(p => !parsed.some(q => q.path.startsWith(p.path + '.')))
        setSchemaList(leaves)
      })
      .catch(() => {})
  }, [open])

  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        field: '',
        fieldType: 'string',
        op: 'eq',
        value: ''
      }
    ])
  }

  const updateCondition = (id: string, patch: Partial<SearchCondition>) => {
    setConditions(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  const removeCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }

  const buildUrl = (): string => {
    const base = searchPath === '/' ? `/d/` : `/d${searchPath}`
    const params: string[] = ['f']
    conditions.forEach(c => {
      const p = conditionToParam(c)
      if (p) params.push(p)
    })
    return `${base}?${params.join('&')}`
  }

  const handleSearch = async () => {
    setLoading(true)
    setError(undefined)
    setResults([])
    setSearched(false)
    // 状態を保存
    const state: SearchState = { searchPath, conditions }
    onStateChange?.(state)
    try {
      const url = buildUrl()
      const res = await fetcher(url, 'get')
      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        setResults([])
      } else {
        setResults(Array.isArray(res.data) ? res.data : [res.data])
      }
    } catch (err: any) {
      if (err?.response?.status === 204) {
        setResults([])
      } else {
        setError(err?.response?.data?.feed?.title ?? '検索に失敗しました。')
      }
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleResultClick = (entry: VtecxApp.Entry) => {
    const key = entry.link?.find(l => l.___rel === 'self')?.___href ?? entry.id?.split(',')[0] ?? ''
    if (!key) return
    // 検索状態を保存してからナビゲート
    onStateChange?.({ searchPath, conditions })
    onClose()
    onNavigate(key)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Search fontSize="small" sx={{ color: blue[500] }} />
        <Box flex={1}>
          <Typography fontWeight={700}>検索</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* ── 検索パス ── */}
        <Box>
          <Typography
            variant="caption"
            fontWeight={700}
            color={grey[500]}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}
          >
            検索パス
          </Typography>
          <PathInput value={searchPath} onChange={setSearchPath} />
          <Typography variant="caption" color={grey[400]} sx={{ mt: 0.5, display: 'block' }}>
            候補をクリックするか直接入力してください。末尾が「/」の場合はその配下を検索します。
          </Typography>
        </Box>

        <Divider />

        {/* ── 条件 ── */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography
              variant="caption"
              fontWeight={700}
              color={grey[500]}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              絞り込み条件
            </Typography>
            <Box display="flex" gap={1}>
              {conditions.length > 0 && (
                <Button
                  size="small"
                  startIcon={<Close />}
                  onClick={() => setConditions([])}
                  color="inherit"
                >
                  クリア
                </Button>
              )}
              <Button size="small" startIcon={<Add />} onClick={addCondition} variant="outlined">
                条件を追加
              </Button>
            </Box>
          </Box>

          {conditions.length === 0 ? (
            <Box
              sx={{
                p: 2,
                border: `1.5px dashed ${grey[300]}`,
                borderRadius: 1,
                textAlign: 'center'
              }}
            >
              <Typography variant="caption" color={grey[400]}>
                条件なし（パス配下の全件を取得）
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {conditions.map((c, idx) => (
                <Box
                  key={c.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1,
                    border: `1px solid ${grey[200]}`,
                    borderRadius: 1,
                    bgcolor: grey[50]
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: grey[400], minWidth: 16, pt: 1.2, fontWeight: 600 }}
                  >
                    {idx + 1}
                  </Typography>

                  {/* フィールド選択 */}
                  <Box sx={{ flex: 2, minWidth: 0 }}>
                    <SchemaFieldPicker
                      externalSchemaList={schemaList}
                      initialField={c.field}
                      onPick={f =>
                        updateCondition(c.id, {
                          field: f.path,
                          fieldType: f.type,
                          op: OPS_FOR_TYPE(f.type)[0]
                        })
                      }
                    />
                    {c.field && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: blue[600],
                          fontFamily: 'monospace',
                          fontSize: '0.65rem',
                          display: 'block',
                          mt: 0.25
                        }}
                      >
                        {c.field}
                      </Typography>
                    )}
                  </Box>

                  {/* オペレータ */}
                  <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0 }}>
                    <InputLabel>条件</InputLabel>
                    <Select
                      label="条件"
                      value={c.op}
                      onChange={e => updateCondition(c.id, { op: e.target.value as SearchOp })}
                    >
                      {OPS_FOR_TYPE(c.fieldType).map(op => (
                        <MenuItem key={op} value={op}>
                          <Typography variant="caption">{OP_LABELS[op]}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* 値 */}
                  <TextField
                    size="small"
                    label="値"
                    sx={{ flex: 2, minWidth: 0 }}
                    value={c.value}
                    onChange={e => updateCondition(c.id, { value: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />

                  <IconButton
                    size="small"
                    onClick={() => removeCondition(c.id)}
                    sx={{ color: grey[400], mt: 0.5 }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {/* 生成されるURLプレビュー */}
          {(searchPath !== '/' || conditions.some(c => c.field && c.value)) && (
            <Box sx={{ mt: 1, p: 1, bgcolor: grey[100], borderRadius: 1 }}>
              <Typography
                variant="caption"
                color={grey[500]}
                sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
              >
                生成されるURL
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: grey[700] }}
              >
                {buildUrl()}
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── 検索結果 ── */}
        {(searched || loading) && (
          <>
            <Divider />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color={grey[500]}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}
                >
                  検索結果
                </Typography>
                {searched && !loading && (
                  <Chip
                    label={`${results.length}件`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: results.length > 0 ? blue[100] : grey[200],
                      color: results.length > 0 ? blue[900] : grey[600]
                    }}
                  />
                )}
              </Box>

              {loading && (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={28} />
                </Box>
              )}

              {error && !loading && <Alert severity="error">{error}</Alert>}

              {searched && !loading && !error && results.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color={grey[500]}>
                    該当するデータが見つかりませんでした。
                  </Typography>
                </Box>
              )}

              {!loading && results.length > 0 && (
                <Box sx={{ border: `1px solid ${grey[200]}`, borderRadius: 1, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: grey[50], py: 0.5 }}>
                          <Typography variant="caption" fontWeight={600}>
                            キー
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: grey[50],
                            py: 0.5,
                            display: { xs: 'none', md: 'table-cell' }
                          }}
                        >
                          <Typography variant="caption" fontWeight={600}>
                            タイトル
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: grey[50],
                            py: 0.5,
                            display: { xs: 'none', md: 'table-cell' }
                          }}
                        >
                          <Typography variant="caption" fontWeight={600}>
                            更新日時
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ bgcolor: grey[50], py: 0.5, width: 32 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((entry, i) => {
                        const key =
                          entry.link?.find(l => l.___rel === 'self')?.___href ??
                          entry.id?.split(',')[0] ??
                          ''
                        const name = key.split('/').filter(Boolean).pop() ?? key
                        return (
                          <TableRow
                            key={i}
                            hover
                            sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                            onClick={() => handleResultClick(entry)}
                          >
                            <TableCell sx={{ py: 0.75 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  color: teal[700],
                                  display: 'block'
                                }}
                              >
                                {name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: grey[400],
                                  fontSize: '0.6rem'
                                }}
                              >
                                {key}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.75, display: { xs: 'none', md: 'table-cell' } }}>
                              <Typography variant="caption" color={grey[700]}>
                                {entry.title ?? '-'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.75, display: { xs: 'none', md: 'table-cell' } }}>
                              <Typography variant="caption" color={grey[500]}>
                                {entry.updated
                                  ? dayjs(entry.updated).format('YYYY/MM/DD HH:mm')
                                  : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.75 }}>
                              <ChevronRight fontSize="small" sx={{ color: grey[400] }} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {results.length >= 50 && (
                    <Box sx={{ p: 1.5, bgcolor: grey[50], borderTop: `1px solid ${grey[200]}` }}>
                      <Typography variant="caption" color={grey[400]}>
                        50件以上の結果があります。条件を絞り込んでください。
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          閉じる
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <Search />}
          onClick={handleSearch}
          disabled={loading}
        >
          検索
        </Button>
      </DialogActions>
    </Dialog>
  )
}
