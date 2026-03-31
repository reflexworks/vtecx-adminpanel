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
  Alert
} from '@mui/material'
import { Add, Edit, Close, ChevronRight } from '@mui/icons-material'
import { grey, teal, blue } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import { fetcher } from '../../../../../../utils/fetcher'

const AliasInput: React.FC<{ onAdd: (href: string) => void; selfKey?: string }> = ({
  onAdd,
  selfKey = ''
}) => {
  const [value, setValue] = React.useState('/')
  const [candidates, setCandidates] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [dropOpen, setDropOpen] = React.useState(false)
  const [confirmedValues, setConfirmedValues] = React.useState<Set<string>>(new Set())
  const [validHrefs, setValidHrefs] = React.useState<Set<string>>(new Set())
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const existenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const canAdd =
    value !== '/' && value.trim() !== '' && (confirmedValues.has(value) || validHrefs.has(value))
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputBoxRef = React.useRef<HTMLDivElement>(null)

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
      setValidHrefs(prev => {
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

  // 有効なパス: 先頭が / で連続スラッシュなし、空セグメントなし
  const isValidPath = (v: string) =>
    /^(\/[a-zA-Z0-9_$\-.~!*'();:@&=+,?#[\]%]+)+\/?$/.test(v) || v === '/'

  const checkExistence = React.useCallback(async (path: string) => {
    if (!path || path === '/') return
    if (!isValidPath(path)) return // 不正パスは存在チェックしない
    try {
      const res = await fetcher(`/d${path}?e`, 'get')
      // 204 = データなし → 存在しない
      if (res.status === 204) return
      setValidHrefs(prev => new Set(prev).add(path))
    } catch (err: any) {
      // 404 や 400 など → 存在しない or 不正パス → 追加しない
    }
  }, [])

  const handleChange = (val: string) => {
    const v = val.startsWith('/') ? val : '/' + val
    setValue(v)
    // 連続スラッシュや不正パスは候補検索・存在チェックしない
    if (!isValidPath(v) && v !== '/') {
      setDropOpen(false)
      return
    }
    if (v.endsWith('/')) {
      searchCandidates(v)
    } else {
      setDropOpen(false)
      if (v !== '/' && !validHrefs.has(v) && !confirmedValues.has(v)) {
        if (existenceTimerRef.current) clearTimeout(existenceTimerRef.current)
        existenceTimerRef.current = setTimeout(() => checkExistence(v), 400)
      }
    }
  }

  const handleFocus = () => {
    if (value === '/') {
      searchCandidates('/')
    } else if (candidates.length > 0) {
      setDropOpen(true)
    } else if (value.endsWith('/')) {
      searchCandidates(value)
    }
  }

  const scrollToItem = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleSelect = (href: string) => {
    setValue(href)
    setConfirmedValues(prev => new Set(prev).add(href))
    setDropOpen(false)
    setCandidates([])
    setSearched(false)
    setActiveIdx(-1)
  }

  const handleAdd = () => {
    const v = value.trim()
    if (!v || v === '/' || !canAdd) return
    // 選択した候補パス + 自分のキーを結合
    const aliasHref = selfKey ? `${v.replace(/\/$/, '')}/${selfKey}` : v
    onAdd(aliasHref)
    setValue('/')
    setCandidates([])
    setSearched(false)
  }

  return (
    <Box ref={containerRef}>
      <Box display="flex" gap={1} alignItems="flex-start">
        <Box flex={1} ref={inputBoxRef} sx={{ position: 'relative' }}>
          <TextField
            size="small"
            fullWidth
            label="Aliasキー"
            value={value}
            onChange={e => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={() =>
              setTimeout(() => {
                setDropOpen(false)
                setActiveIdx(-1)
              }, 150)
            }
            onKeyDown={e => {
              if (!dropOpen || candidates.length === 0) {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
                return
              }
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
                if (activeIdx >= 0 && activeIdx < candidates.length)
                  handleSelect(candidates[activeIdx])
                else handleAdd()
              } else if (e.key === 'Escape') {
                setDropOpen(false)
              }
            }}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: loading ? <CircularProgress size={14} /> : undefined,
                inputProps: { 'data-testid': 'alias-key-input' }
              }
            }}
          />
        </Box>
        <Button
          variant="outlined"
          onClick={handleAdd}
          disabled={!canAdd}
          startIcon={<Add />}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 40 }}
          data-testid="alias-add-button"
        >
          追加
        </Button>
      </Box>
      {dropOpen && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            zIndex: 1400,
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

// ─── Alias専用編集モーダル ───────────────────────────────────────

export const AliasEditModal: React.FC<{
  open: boolean
  onClose: () => void
  entry: VtecxApp.Entry
  onSuccess: () => void
}> = ({ open, onClose, entry, onSuccess }) => {
  const entryKey =
    entry.link?.find(l => l.___rel === 'self')?.___href ?? entry.id?.split(',')[0] ?? ''
  const selfHref = entry.link?.find(l => l.___rel === 'self')?.___href ?? ''
  const [aliases, setAliases] = React.useState<{ href: string }[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (!open) return
    setAliases(
      (entry.link ?? [])
        .filter(l => l.___rel === 'alternate' && l.___href)
        .map(l => ({ href: l.___href! }))
    )
    setSubmitError(undefined)
  }, [open])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const links: VtecxApp.Link[] = []
      // self link: selfHref または entryKey を使用
      const self = selfHref || entryKey
      if (self) links.push({ ___href: self, ___rel: 'self' })
      aliases.forEach(a => links.push({ ___href: a.href, ___rel: 'alternate' }))
      // 既存の他のlink(selfとalternate以外)を保持
      ;(entry.link ?? [])
        .filter(l => l.___rel !== 'self' && l.___rel !== 'alternate')
        .forEach(l => links.push(l))
      const updated: VtecxApp.Entry = { ...entry, link: links.length > 0 ? links : undefined }
      await fetcher(`/d/`, 'put', [updated])
      onSuccess()
      onClose()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.feed?.title ?? 'エラーが発生しました。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      data-testid="alias-edit-dialog"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Box flex={1}>
          <Typography fontWeight={700}>別名 (Alias) 編集</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {entryKey}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* 新規追加 */}
        {(() => {
          const selfKey = entryKey.split('/').filter(Boolean).pop() ?? ''
          return (
            <AliasInput
              selfKey={selfKey}
              onAdd={href => {
                if (!href || aliases.some(a => a.href === href)) return
                setAliases(prev => [...prev, { href }])
              }}
            />
          )
        })()}
        {/* 一覧 */}
        {aliases.length === 0 ? (
          <Typography variant="caption" color={grey[400]}>
            設定なし
          </Typography>
        ) : (
          aliases.map((a, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 0.75,
                borderRadius: 1,
                bgcolor: teal[50],
                border: `1px solid ${teal[100]}`
              }}
            >
              <ChevronRight fontSize="small" sx={{ color: teal[400], flexShrink: 0 }} />
              <Typography
                variant="caption"
                sx={{ flex: 1, fontFamily: 'monospace', color: teal[700], wordBreak: 'break-all' }}
              >
                {a.href}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setAliases(prev => prev.filter((_, j) => j !== i))}
                sx={{ color: grey[400] }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={submitting || aliases.length === 0}
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={14} /> : <Edit />}
          data-testid="alias-save-button"
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  )
}
