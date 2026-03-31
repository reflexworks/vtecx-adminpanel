import React from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Link,
  Divider,
  RadioGroup,
  Radio,
  FormControlLabel,
  Popover
} from '@mui/material'
import { Search, Lock, LockOpen, DeleteOutline } from '@mui/icons-material'
import { grey, blue, orange, red, teal } from '@mui/material/colors'
import { fetcher } from '../../../../../../utils/fetcher'
import VtecxApp from '../../../../../../typings'
import {
  AclEntry,
  AclPermission,
  GroupOption,
  PERMISSION_DEFS,
  emptyPermission,
  parseContributorUri,
  resolveGroupLabel,
  permissionSummary
} from '../../types'

// ─── グループ検索ドロップダウン ──────────────────────────────

interface GroupSelectorProps {
  options: GroupOption[]
  selectedValues: string[]
  onSelect: (value: string) => void
  disabled?: boolean
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  options,
  selectedValues,
  onSelect,
  disabled
}) => {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    )
  }, [options, query])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getDropdownStyle = () => {
    if (!containerRef.current) return {}
    const rect = containerRef.current.getBoundingClientRect()
    return { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }

  const unselectedCount = options.filter(o => !selectedValues.includes(o.value)).length

  const scrollToItem = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.min(prev + 1, filtered.length - 1)
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
      const target = filtered[activeIdx]
      if (target && !selectedValues.includes(target.value)) {
        onSelect(target.value)
        setQuery('')
        setOpen(false)
        setActiveIdx(-1)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <TextField
        size="small"
        fullWidth
        placeholder={
          disabled
            ? 'グループ一覧を取得中…'
            : unselectedCount === 0
              ? 'すべてのグループが追加済みです'
              : 'グループを検索して追加…'
        }
        value={query}
        disabled={disabled || unselectedCount === 0}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIdx(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: grey[400] }} />
              </InputAdornment>
            ),
            inputProps: {
              'data-testid': 'group-search-input'
            }
          }
        }}
        onBlur={() =>
          setTimeout(() => {
            setOpen(false)
            setActiveIdx(-1)
          }, 150)
        }
        sx={{ bgcolor: 'background.paper' }}
      />
      {open && filtered.length > 0 && (
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
            {filtered.some(o => o.isSpecial) && (
              <Box px={1.5} pt={1} pb={0.25}>
                <Typography variant="caption" sx={{ color: grey[500], fontWeight: 600 }}>
                  共通
                </Typography>
              </Box>
            )}
            {filtered
              .filter(o => o.isSpecial)
              .map(opt => (
                <ListItemButton
                  key={opt.value}
                  disabled={selectedValues.includes(opt.value)}
                  onClick={() => {
                    onSelect(opt.value)
                    setQuery('')
                    setOpen(false)
                    setActiveIdx(-1)
                  }}
                  sx={{
                    opacity: selectedValues.includes(opt.value) ? 0.45 : 1,
                    bgcolor: filtered.indexOf(opt) === activeIdx ? blue[50] : undefined
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <LockOpen fontSize="small" sx={{ color: orange[600] }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600}>
                        {opt.label}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{ color: grey[500], fontFamily: 'monospace' }}
                      >
                        {opt.value}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            {filtered.some(o => o.isSpecial) && filtered.some(o => !o.isSpecial) && <Divider />}
            {filtered.some(o => !o.isSpecial) && (
              <Box px={1.5} pt={1} pb={0.25}>
                <Typography variant="caption" sx={{ color: grey[500], fontWeight: 600 }}>
                  グループ
                </Typography>
              </Box>
            )}
            {filtered
              .filter(o => !o.isSpecial)
              .map(opt => (
                <ListItemButton
                  key={opt.value}
                  disabled={selectedValues.includes(opt.value)}
                  onClick={() => {
                    onSelect(opt.value)
                    setQuery('')
                    setOpen(false)
                    setActiveIdx(-1)
                  }}
                  sx={{
                    opacity: selectedValues.includes(opt.value) ? 0.45 : 1,
                    bgcolor: filtered.indexOf(opt) === activeIdx ? blue[50] : undefined
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Lock fontSize="small" sx={{ color: blue[500] }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{opt.label}</Typography>}
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{ color: grey[500], fontFamily: 'monospace' }}
                      >
                        {opt.value}
                      </Typography>
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

// ─── ユーザー検索セレクター ──────────────────────────────────

const UserSelector: React.FC<{
  selectedValues: string[]
  onSelect: (value: string, label: string) => void
}> = ({ selectedValues, onSelect }) => {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<{ uid: string; title: string; href: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getDropdownStyle = () => {
    if (!containerRef.current) return {}
    const rect = containerRef.current.getBoundingClientRect()
    return { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }

  const isEmail = (val: string) => /[^@]+@[^@]+/.test(val)
  const isNumeric = (val: string) => /^\d+$/.test(val.trim())

  const scrollToItemU = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDownU = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.min(prev + 1, results.length - 1)
        scrollToItemU(n)
        return n
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.max(prev - 1, 0)
        scrollToItemU(n)
        return n
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIdx]
      if (target && !selectedValues.includes(target.uid)) {
        onSelect(target.uid, target.title)
        setQuery('')
        setResults([])
        setOpen(false)
        setActiveIdx(-1)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleChange = (val: string) => {
    setQuery(val)
    setActiveIdx(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      if (!isEmail(val) && !isNumeric(val)) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const url = isEmail(val)
          ? `/d/_user?f&title=${encodeURIComponent(val)}`
          : `/d/_user/${encodeURIComponent(val.trim())}?e`
        const res = await fetcher(url, 'get')
        const entries: any[] = isNumeric(val)
          ? Array.isArray(res.data)
            ? res.data
            : res.data
              ? [res.data]
              : []
          : Array.isArray(res.data)
            ? res.data
            : []
        setResults(
          entries
            .map(e => ({
              uid:
                String(e.id ?? '')
                  .split(',')[0]
                  ?.replace(/^\/_user\//, '') ?? '',
              title: e.title ?? e.id ?? '',
              href: e.link?.find((l: any) => l.___rel === 'self')?.___href ?? e.id ?? ''
            }))
            .filter(e => e.uid)
        )
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <TextField
        size="small"
        fullWidth
        placeholder="メールアドレスまたはユーザーIDを入力…"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true)
        }}
        onBlur={() =>
          setTimeout(() => {
            setOpen(false)
            setActiveIdx(-1)
          }, 150)
        }
        onKeyDown={handleKeyDownU}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: grey[400] }} />
              </InputAdornment>
            ),
            endAdornment: loading ? <CircularProgress size={14} /> : undefined
          }
        }}
        sx={{ bgcolor: 'background.paper' }}
      />
      {open && results.length > 0 && (
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
            {results.map((u, i) => {
              const already = selectedValues.includes(u.uid)
              return (
                <ListItemButton
                  key={u.uid}
                  disabled={already}
                  onClick={() => {
                    onSelect(u.uid, u.title)
                    setQuery('')
                    setResults([])
                    setOpen(false)
                    setActiveIdx(-1)
                  }}
                  sx={{
                    opacity: already ? 0.45 : 1,
                    bgcolor: i === activeIdx ? blue[50] : undefined
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Lock fontSize="small" sx={{ color: teal[500] }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{u.title}</Typography>}
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{ color: grey[500], fontFamily: 'monospace' }}
                      >
                        uid: {u.uid}
                        {already ? ' (追加済み)' : ''}
                      </Typography>
                    }
                  />
                </ListItemButton>
              )
            })}
          </List>
        </Paper>
      )}
      {query && !loading && results.length === 0 && (isEmail(query) || isNumeric(query)) && (
        <Typography variant="caption" color={grey[400]} sx={{ mt: 0.5, display: 'block', px: 0.5 }}>
          該当するユーザーが見つかりませんでした
        </Typography>
      )}
      {query && !isEmail(query) && !isNumeric(query) && (
        <Typography variant="caption" color={grey[400]} sx={{ mt: 0.5, display: 'block', px: 0.5 }}>
          メールアドレスまたは数値のユーザーIDを入力してください
        </Typography>
      )}
    </Box>
  )
}

// ─── 権限選択カード ───────────────────────────────────────────

const AclEntryCard: React.FC<{
  entry: AclEntry
  label: string
  isSpecial: boolean
  readonly?: boolean
  onChange: (updated: AclEntry) => void
  onRemove: () => void
}> = ({ entry, label, isSpecial, readonly, onChange, onRemove }) => {
  const handlePerm = (key: keyof AclPermission) => {
    if (readonly) return
    onChange({ ...entry, permissions: { ...entry.permissions, [key]: !entry.permissions[key] } })
  }
  const perm = permissionSummary(entry.permissions)
  const isUser = /^\d+$/.test(entry.group)
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [userTitle, setUserTitle] = React.useState<string | null>(null)
  const [userLoading, setUserLoading] = React.useState(false)

  const handleUserFocus = async (
    e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>
  ) => {
    if (!isUser) return
    setAnchorEl(e.currentTarget)
    if (userTitle !== null) return
    setUserLoading(true)
    try {
      const res = await fetcher(`/d/_user/${entry.group}?e`, 'get')
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      setUserTitle(data?.title ?? null)
    } catch {
      setUserTitle(null)
    } finally {
      setUserLoading(false)
    }
  }

  const handleUserBlur = () => setAnchorEl(null)

  return (
    <Box
      sx={{
        border: '1.5px solid',
        borderColor: readonly ? grey[300] : isSpecial ? orange[200] : blue[100],
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        bgcolor: readonly ? grey[50] : isSpecial ? orange[50] : blue[50]
      }}
    >
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
        <Box minWidth={0}>
          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
            {isSpecial ? (
              <LockOpen fontSize="small" sx={{ color: orange[600], flexShrink: 0 }} />
            ) : (
              <Lock
                fontSize="small"
                sx={{ color: readonly ? grey[400] : blue[500], flexShrink: 0 }}
              />
            )}
            {isUser ? (
              <Typography
                variant="body2"
                fontWeight={700}
                noWrap
                sx={{
                  color: readonly ? grey[600] : 'inherit',
                  cursor: 'default',
                  textDecoration: 'underline dotted',
                  textUnderlineOffset: 3
                }}
                onMouseEnter={handleUserFocus}
                onMouseLeave={handleUserBlur}
                onFocus={handleUserFocus}
                onBlur={handleUserBlur}
                tabIndex={0}
              >
                {label}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                fontWeight={700}
                noWrap
                sx={{ color: readonly ? grey[600] : 'inherit' }}
              >
                {label}
              </Typography>
            )}
            {perm && (
              <Chip
                label={perm}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20,
                  bgcolor: readonly ? grey[200] : isSpecial ? orange[100] : blue[100],
                  color: readonly ? grey[600] : isSpecial ? orange[900] : blue[900]
                }}
              />
            )}
            {readonly && (
              <Chip
                label="変更不可"
                size="small"
                sx={{ height: 18, fontSize: '0.6rem', bgcolor: grey[200], color: grey[600] }}
              />
            )}
          </Box>
          {!isUser && (
            <Typography
              variant="caption"
              sx={{ color: grey[500], fontFamily: 'monospace', display: 'block', mt: 0.25 }}
            >
              {entry.group}
            </Typography>
          )}
        </Box>
        {!readonly && (
          <Tooltip title="このグループを削除">
            <IconButton
              size="small"
              onClick={onRemove}
              sx={{ ml: 1, flexShrink: 0, color: grey[400], '&:hover': { color: red[400] } }}
              aria-label="このグループを削除"
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={0.5}>
        {PERMISSION_DEFS.map(({ key, short, label: permLabel, color }) => {
          const checked = entry.permissions[key]
          const effectiveColor = readonly ? grey[400] : color
          return (
            <Box
              key={key}
              onClick={() => handlePerm(key)}
              data-testid={`perm-cell-${entry.group.replace(/[^a-zA-Z0-9]/g, '_')}-${key}`}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0.75,
                borderRadius: 1.5,
                border: '1.5px solid',
                borderColor: checked ? effectiveColor : grey[200],
                bgcolor: checked ? effectiveColor + '18' : 'transparent',
                cursor: readonly ? 'default' : 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
                '&:hover': readonly ? {} : { borderColor: color, bgcolor: color + '12' }
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ color: checked ? effectiveColor : grey[700], lineHeight: 1.2 }}
              >
                {short}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: checked ? effectiveColor : grey[600],
                  fontSize: '0.6rem',
                  lineHeight: 1.2,
                  textAlign: 'center',
                  mt: 0.25
                }}
              >
                {permLabel}
              </Typography>
            </Box>
          )
        })}
      </Box>
      {isUser && (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleUserBlur}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          disableAutoFocus
          disableEnforceFocus
          sx={{ pointerEvents: 'none' }}
        >
          <Box sx={{ px: 1.5, py: 1 }}>
            {userLoading ? (
              <CircularProgress size={12} />
            ) : (
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                {userTitle ?? '取得できませんでした'}
              </Typography>
            )}
          </Box>
        </Popover>
      )}
    </Box>
  )
}

// ─── ACL ユーザーラベル（uid リンク + ポップオーバー）────────────

export const AclUserLabel: React.FC<{ uid: string; onNavigate?: (path: string) => void }> = ({
  uid,
  onNavigate
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [userTitle, setUserTitle] = React.useState<string | null>(null)
  const [userLoading, setUserLoading] = React.useState(false)

  const handleOpen = async (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
    if (userTitle !== null) return
    setUserLoading(true)
    try {
      const res = await fetcher(`/d/_user/${uid}?e`, 'get')
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      setUserTitle(data?.title ?? null)
    } catch {
      setUserTitle(null)
    } finally {
      setUserLoading(false)
    }
  }

  const handleClose = () => setAnchorEl(null)

  return (
    <>
      <Link
        component="button"
        variant="caption"
        underline="hover"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={() => onNavigate?.(`/_user/${uid}`)}
        sx={{
          fontFamily: 'monospace',
          fontWeight: 600,
          fontSize: '0.7rem',
          color: blue[600],
          cursor: 'pointer',
          display: 'block',
          textAlign: 'left'
        }}
      >
        uid: {uid}
      </Link>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        sx={{ pointerEvents: 'none' }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          {userLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {userTitle ?? '取得できませんでした'}
            </Typography>
          )}
        </Box>
      </Popover>
    </>
  )
}

// ─── AclBadges（ポップアップ用小型表示）──────────────────────────

export const AclBadges: React.FC<{ contributors?: VtecxApp.Contributor[] }> = ({
  contributors
}) => {
  if (!contributors || contributors.length === 0) return null
  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      {contributors.map((c, i) => {
        if (!c.uri) return null
        const parsed = parseContributorUri(c.uri)
        if (!parsed)
          return (
            <Typography
              key={i}
              variant="caption"
              sx={{ fontFamily: 'monospace', color: grey[500] }}
            >
              {c.uri.replace('urn:vte.cx:acl:', '')}
            </Typography>
          )
        const label = /^\d+$/.test(parsed.group)
          ? `uid: ${parsed.group}`
          : resolveGroupLabel(parsed.group)
        const perm = permissionSummary(parsed.permissions)
        const isSpecial = parsed.group === '+' || parsed.group === '*'
        return (
          <Box key={i} display="flex" alignItems="center" gap={0.75}>
            <Box sx={{ width: 52, flexShrink: 0 }}>
              {perm && (
                <Chip
                  label={perm}
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 18,
                    width: '100%',
                    bgcolor: isSpecial ? orange[100] : blue[100],
                    color: isSpecial ? orange[900] : blue[900],
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: grey[700],
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// ─── ACL セクション（データ詳細表示用）──────────────────────────
// editLinkTestId prop を追加

export const AclSection: React.FC<{
  contributor?: VtecxApp.Contributor[]
  onEdit?: () => void
  onNavigate?: (path: string) => void
  editLinkTestId?: string
}> = ({ contributor, onEdit, onNavigate, editLinkTestId }) => {
  const aclEntries = (contributor ?? [])
    .map(c => (c.uri?.startsWith('urn:vte.cx:acl:') ? parseContributorUri(c.uri!) : null))
    .filter((x): x is AclEntry => x !== null)

  return (
    <Box sx={{ border: `1px solid ${grey[200]}`, borderRadius: 1, overflow: 'hidden' }}>
      <Box
        display="flex"
        alignItems="center"
        gap={0.75}
        sx={{ px: 1.5, py: 1, bgcolor: grey[50], borderBottom: `1px solid ${grey[200]}` }}
      >
        <Typography
          variant="caption"
          fontWeight={700}
          color={grey[500]}
          sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}
        >
          権限 (ACL)
        </Typography>
        {aclEntries.length > 0 && (
          <Chip
            label={aclEntries.length}
            size="small"
            sx={{ height: 16, fontSize: '0.6rem', bgcolor: blue[100], color: blue[900] }}
          />
        )}
        {onEdit && (
          <Link
            component="button"
            variant="caption"
            underline="hover"
            onClick={onEdit}
            sx={{ color: blue[600], cursor: 'pointer', fontSize: '0.7rem' }}
            data-testid={editLinkTestId}
          >
            追加・変更
          </Link>
        )}
      </Box>
      <Box>
        {aclEntries.length === 0 ? (
          <Typography variant="caption" color={grey[400]} sx={{ display: 'block', p: 1.5 }}>
            設定なし
          </Typography>
        ) : (
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    py: 0.5,
                    px: 1,
                    fontSize: '0.65rem',
                    color: grey[500],
                    fontWeight: 700,
                    width: '60%',
                    bgcolor: grey[50]
                  }}
                >
                  グループ
                </TableCell>
                <TableCell
                  sx={{
                    py: 0.5,
                    px: 1,
                    fontSize: '0.65rem',
                    color: grey[500],
                    fontWeight: 700,
                    bgcolor: grey[50]
                  }}
                >
                  権限
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aclEntries.map((parsed, i) => {
                const isUser = /^\d+$/.test(parsed.group)
                const label = isUser ? `uid: ${parsed.group}` : resolveGroupLabel(parsed.group)
                const perm = permissionSummary(parsed.permissions)
                const isSpecial = parsed.group === '+' || parsed.group === '*'
                return (
                  <TableRow
                    key={i}
                    sx={{
                      '&:last-child td': { border: 0 },
                      bgcolor: isSpecial ? orange[50] : undefined
                    }}
                  >
                    <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'top' }}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {isSpecial ? (
                          <LockOpen sx={{ fontSize: 12, color: orange[500], flexShrink: 0 }} />
                        ) : (
                          <Lock sx={{ fontSize: 12, color: blue[400], flexShrink: 0 }} />
                        )}
                        <Box minWidth={0}>
                          {isUser ? (
                            <AclUserLabel uid={parsed.group} onNavigate={onNavigate} />
                          ) : (
                            <>
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                display="block"
                                noWrap
                                sx={{ fontSize: '0.7rem' }}
                              >
                                {label}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: grey[400],
                                  fontFamily: 'monospace',
                                  fontSize: '0.58rem',
                                  wordBreak: 'break-all'
                                }}
                              >
                                {parsed.group}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, px: 1 }}>
                      <Chip
                        label={perm || '—'}
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.6rem',
                          height: 18,
                          bgcolor: isSpecial ? orange[100] : blue[100],
                          color: isSpecial ? orange[900] : blue[900]
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  )
}

// ─── ACL エディタ（モーダル内編集用）──────────────────────────────

export const AclEditor: React.FC<{
  aclEntries: AclEntry[]
  onChange: (entries: AclEntry[]) => void
  groupOptions: GroupOption[]
  loading: boolean
  forbidden: boolean
}> = ({ aclEntries, onChange, groupOptions, loading, forbidden }) => {
  const [selectorMode, setSelectorMode] = React.useState<'group' | 'user'>('group')
  const selectedValues = aclEntries.map(e => e.group)

  const handleAdd = (value: string) => {
    if (selectedValues.includes(value)) return
    const newEntries = [...aclEntries, { group: value, permissions: emptyPermission() }]
    newEntries.sort((a, b) => {
      if (a.group === '/_group/$admin') return -1
      if (b.group === '/_group/$admin') return 1
      const idxA = groupOptions.findIndex(o => o.value === a.group)
      const idxB = groupOptions.findIndex(o => o.value === b.group)
      return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB)
    })
    onChange(newEntries)
  }

  if (forbidden)
    return (
      <Alert severity="warning" icon={<Lock fontSize="small" />} sx={{ mt: 2, borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600}>
          ACL設定は管理者のみ利用できます
        </Typography>
        <Typography variant="caption">グループ一覧の取得に必要な権限がありません。</Typography>
      </Alert>
    )

  return (
    <Box mt={2}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Lock fontSize="small" sx={{ color: blue[500] }} />
        <Typography variant="subtitle2" fontWeight={700}>
          ACL設定
        </Typography>
        {aclEntries.length > 0 && (
          <Chip
            label={`${aclEntries.length}件`}
            size="small"
            sx={{ height: 18, fontSize: '0.65rem', bgcolor: blue[100], color: blue[900] }}
          />
        )}
      </Box>
      <RadioGroup
        row
        value={selectorMode}
        onChange={e => setSelectorMode(e.target.value as 'group' | 'user')}
        sx={{ mb: 1 }}
      >
        <FormControlLabel
          value="group"
          control={<Radio size="small" />}
          label={<Typography variant="caption">グループ検索</Typography>}
        />
        <FormControlLabel
          value="user"
          control={<Radio size="small" />}
          label={<Typography variant="caption">ユーザー検索</Typography>}
        />
      </RadioGroup>
      {selectorMode === 'group' ? (
        <>
          <GroupSelector
            options={groupOptions}
            selectedValues={selectedValues}
            onSelect={handleAdd}
            disabled={loading}
          />
          {loading && (
            <Box display="flex" alignItems="center" gap={1} mt={1.5} px={0.5}>
              <CircularProgress size={14} />
              <Typography variant="caption" color={grey[500]}>
                グループ一覧を取得中…
              </Typography>
            </Box>
          )}
        </>
      ) : (
        <UserSelector selectedValues={selectedValues} onSelect={(val, _label) => handleAdd(val)} />
      )}
      <Box mt={1.5}>
        {aclEntries.length === 0 ? (
          <Box
            sx={{ border: `1.5px dashed ${grey[300]}`, borderRadius: 2, p: 2, textAlign: 'center' }}
          >
            <Typography variant="caption" color={grey[400]}>
              グループまたはユーザーを検索して権限を追加してください
            </Typography>
          </Box>
        ) : (
          aclEntries.map(entry => {
            const isAdmin = entry.group === '/_group/$admin'
            const opt = groupOptions.find(o => o.value === entry.group)
            const isUser = /^\d+$/.test(entry.group)
            const label =
              opt?.label ?? (isUser ? `uid: ${entry.group}` : resolveGroupLabel(entry.group))
            const isSpecial = opt?.isSpecial ?? (entry.group === '+' || entry.group === '*')
            return (
              <AclEntryCard
                key={entry.group}
                entry={entry}
                label={label}
                isSpecial={isSpecial}
                readonly={isAdmin}
                onChange={updated =>
                  onChange(aclEntries.map(e => (e.group === updated.group ? updated : e)))
                }
                onRemove={() => onChange(aclEntries.filter(e => e.group !== entry.group))}
              />
            )
          })
        )}
      </Box>
    </Box>
  )
}

// ─── AclChips（一覧テーブルのツールチップ用）────────────────────

export const AclChips: React.FC<{ contributors?: VtecxApp.Contributor[] }> = ({ contributors }) => {
  const aclList = (contributors ?? [])
    .filter(c => c.uri?.startsWith('urn:vte.cx:acl:'))
    .map(c => parseContributorUri(c.uri!))
    .filter((x): x is AclEntry => x !== null)

  if (aclList.length === 0)
    return (
      <Typography variant="caption" color={grey[400]}>
        -
      </Typography>
    )

  return (
    <Box display="flex" flexWrap="wrap" gap={0.5}>
      {Object.entries(
        aclList.reduce<Record<string, AclEntry[]>>((acc, acl) => {
          const perm = permissionSummary(acl.permissions) || '-'
          ;(acc[perm] = acc[perm] ?? []).push(acl)
          return acc
        }, {})
      ).map(([perm, group]) => {
        const hasSpecial = group.some(a => a.group === '+' || a.group === '*')
        return (
          <Tooltip
            key={perm}
            arrow
            placement="top"
            title={
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {group.map(acl => (
                  <Box key={acl.group}>
                    <Typography variant="caption" display="block" fontWeight={700} lineHeight={1.3}>
                      {/^\d+$/.test(acl.group) ? `uid: ${acl.group}` : resolveGroupLabel(acl.group)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: grey[300], fontSize: '0.6rem' }}
                    >
                      {acl.group}
                    </Typography>
                  </Box>
                ))}
              </Box>
            }
          >
            <Chip
              label={perm}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                cursor: 'default',
                bgcolor: hasSpecial ? orange[100] : blue[50],
                color: hasSpecial ? orange[900] : blue[800],
                border: `1px solid ${hasSpecial ? orange[200] : blue[100]}`,
                '& .MuiChip-label': { px: 0.75 }
              }}
            />
          </Tooltip>
        )
      })}
    </Box>
  )
}
