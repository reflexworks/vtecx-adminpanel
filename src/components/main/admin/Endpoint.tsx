import React from 'react'
import MainContainer from '../../parts/Container'
import { Add, Edit, Refresh, DeleteOutline, Search, Lock, LockOpen } from '@mui/icons-material'
import {
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse
} from '@mui/material'
import { grey, blue, green, orange, red, purple } from '@mui/material/colors'
import validation, { ValidationProps } from '../../../utils/validation'
import BasicModal from '../../parts/Modal'
import AlertDialog from '../../parts/Dialog'
import useEndpoint from '../../../hooks/useEndpoint'
import VtecxApp from '../../../typings'
import CopyCommandMenu from '../../parts/CopyCommandMenu'
import { fetcher } from '../../../utils/fetcher'

// ─── 型定義 ──────────────────────────────────────────────────

interface AclPermission {
  C: boolean
  R: boolean
  U: boolean
  D: boolean
  E: boolean
}

interface AclEntry {
  group: string
  permissions: AclPermission
}

interface GroupOption {
  value: string
  label: string
  isSpecial: boolean
}

// ─── 定数 ───────────────────────────────────────────────────

const SPECIAL_GROUPS: GroupOption[] = [
  { value: '+', label: 'ログイン可能な全ユーザ', isSpecial: true },
  { value: '*', label: '全てのユーザ（未ログイン含む）', isSpecial: true }
]

const DEFAULT_GROUP_LABELS: Record<string, string> = {
  '/_group/$admin': 'サービス管理者',
  '/_group/$content': 'コンテンツ管理者',
  '/_group/$useradmin': 'ユーザ管理者'
}

const PERMISSION_DEFS: { key: keyof AclPermission; short: string; label: string; color: string }[] =
  [
    { key: 'C', short: 'C', label: '作成', color: green[600] },
    { key: 'R', short: 'R', label: '読取', color: blue[600] },
    { key: 'U', short: 'U', label: '更新', color: orange[700] },
    { key: 'D', short: 'D', label: '削除', color: red[600] },
    { key: 'E', short: 'E', label: 'サービス経由', color: purple[600] }
  ]

const emptyPermission = (): AclPermission => ({ C: false, R: false, U: false, D: false, E: false })

// ─── ユーティリティ ──────────────────────────────────────────

function parseContributorUri(uri: string): AclEntry | null {
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

function buildContributorUri(entry: AclEntry): string {
  const permStr = (['C', 'R', 'U', 'D', 'E'] as (keyof AclPermission)[])
    .filter(k => entry.permissions[k])
    .join('')
  return `urn:vte.cx:acl:${entry.group},${permStr}`
}

function resolveGroupLabel(value: string): string {
  if (DEFAULT_GROUP_LABELS[value]) return DEFAULT_GROUP_LABELS[value]
  if (value === '+') return 'ログイン可能な全ユーザ'
  if (value === '*') return '全てのユーザ（未ログイン含む）'
  return value.replace(/^\/_group\//, '')
}

function permissionSummary(p: AclPermission): string {
  return (['C', 'R', 'U', 'D', 'E'] as (keyof AclPermission)[]).filter(k => p[k]).join('')
}

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
  const ref = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    )
  }, [options, query])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unselectedCount = options.filter(o => !selectedValues.includes(o.value)).length

  return (
    <Box ref={ref} sx={{ position: 'relative' }}>
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
        }}
        onFocus={() => setOpen(true)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: grey[400] }} />
              </InputAdornment>
            )
          }
        }}
        sx={{ bgcolor: 'background.paper' }}
      />
      <Collapse in={open && filtered.length > 0}>
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            zIndex: 1300,
            width: '100%',
            maxHeight: 240,
            overflowY: 'auto',
            mt: 0.5,
            border: `1px solid ${grey[200]}`
          }}
        >
          <List dense disablePadding>
            {/* 特殊グループを先頭にセクション分け */}
            {filtered.some(o => o.isSpecial) && (
              <Box px={1.5} pt={1} pb={0.25}>
                <Typography
                  variant="caption"
                  sx={{ color: grey[500], fontWeight: 600, letterSpacing: '0.05em' }}
                >
                  共通
                </Typography>
              </Box>
            )}
            {filtered
              .filter(o => o.isSpecial)
              .map(opt => (
                <GroupListItem
                  key={opt.value}
                  opt={opt}
                  added={selectedValues.includes(opt.value)}
                  onSelect={() => {
                    onSelect(opt.value)
                    setQuery('')
                    setOpen(false)
                  }}
                />
              ))}
            {filtered.some(o => o.isSpecial) && filtered.some(o => !o.isSpecial) && <Divider />}
            {filtered.some(o => !o.isSpecial) && (
              <Box px={1.5} pt={1} pb={0.25}>
                <Typography
                  variant="caption"
                  sx={{ color: grey[500], fontWeight: 600, letterSpacing: '0.05em' }}
                >
                  グループ
                </Typography>
              </Box>
            )}
            {filtered
              .filter(o => !o.isSpecial)
              .map(opt => (
                <GroupListItem
                  key={opt.value}
                  opt={opt}
                  added={selectedValues.includes(opt.value)}
                  onSelect={() => {
                    onSelect(opt.value)
                    setQuery('')
                    setOpen(false)
                  }}
                />
              ))}
          </List>
        </Paper>
      </Collapse>
    </Box>
  )
}

const GroupListItem: React.FC<{
  opt: GroupOption
  added: boolean
  onSelect: () => void
}> = ({ opt, added, onSelect }) => (
  <ListItemButton
    disabled={added}
    onClick={onSelect}
    sx={{ opacity: added ? 0.45 : 1, '&:hover': { bgcolor: blue[50] } }}
  >
    <ListItemIcon sx={{ minWidth: 32 }}>
      {opt.isSpecial ? (
        <LockOpen fontSize="small" sx={{ color: orange[600] }} />
      ) : (
        <Lock fontSize="small" sx={{ color: blue[500] }} />
      )}
    </ListItemIcon>
    <ListItemText
      primary={
        <Typography variant="body2" fontWeight={opt.isSpecial ? 600 : 400}>
          {opt.label}
        </Typography>
      }
      secondary={
        <Typography variant="caption" sx={{ color: grey[500], fontFamily: 'monospace' }}>
          {opt.value}
        </Typography>
      }
    />
    {added && (
      <Typography variant="caption" sx={{ color: grey[400], flexShrink: 0 }}>
        追加済
      </Typography>
    )}
  </ListItemButton>
)

// ─── 権限選択カード ───────────────────────────────────────────

interface AclEntryCardProps {
  entry: AclEntry
  label: string
  isSpecial: boolean
  readonly?: boolean
  onChange: (updated: AclEntry) => void
  onRemove: () => void
}

const AclEntryCard: React.FC<AclEntryCardProps> = ({
  entry,
  label,
  isSpecial,
  readonly,
  onChange,
  onRemove
}) => {
  const handlePerm = (key: keyof AclPermission) => {
    if (readonly) return
    onChange({ ...entry, permissions: { ...entry.permissions, [key]: !entry.permissions[key] } })
  }
  const perm = permissionSummary(entry.permissions)

  return (
    <Box
      sx={{
        border: '1.5px solid',
        borderColor: readonly ? grey[300] : isSpecial ? orange[200] : blue[100],
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        bgcolor: readonly ? grey[50] : isSpecial ? orange[50] : blue[50],
        transition: 'box-shadow 0.15s',
        '&:hover': readonly ? {} : { boxShadow: 2 }
      }}
    >
      {/* ヘッダー */}
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
            <Typography
              variant="body2"
              fontWeight={700}
              noWrap
              sx={{ color: readonly ? grey[600] : 'inherit' }}
            >
              {label}
            </Typography>
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
          <Typography
            variant="caption"
            sx={{
              color: grey[500],
              fontFamily: 'monospace',
              display: 'block',
              mt: 0.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {entry.group}
          </Typography>
        </Box>
        {!readonly && (
          <Tooltip title="このグループを削除">
            <IconButton
              size="small"
              onClick={onRemove}
              sx={{ ml: 1, flexShrink: 0, color: grey[400], '&:hover': { color: red[400] } }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 権限セル */}
      <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={0.5}>
        {PERMISSION_DEFS.map(({ key, short, label: permLabel, color }) => {
          const checked = entry.permissions[key]
          const effectiveColor = readonly ? grey[400] : color
          return (
            <Box
              key={key}
              onClick={() => handlePerm(key)}
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
    </Box>
  )
}

// ─── ACL エディタ ─────────────────────────────────────────────

interface AclEditorProps {
  aclEntries: AclEntry[]
  onChange: (entries: AclEntry[]) => void
  groupOptions: GroupOption[]
  loading: boolean
  forbidden: boolean
}

const AclEditor: React.FC<AclEditorProps> = ({
  aclEntries,
  onChange,
  groupOptions,
  loading,
  forbidden
}) => {
  const selectedValues = aclEntries.map(e => e.group)

  const handleAdd = (value: string) => {
    if (selectedValues.includes(value)) return
    const newEntries = [...aclEntries, { group: value, permissions: emptyPermission() }]
    // groupOptions の並び順に合わせてソート（$admin は常に先頭固定）
    newEntries.sort((a, b) => {
      if (a.group === '/_group/$admin') return -1
      if (b.group === '/_group/$admin') return 1
      const idxA = groupOptions.findIndex(o => o.value === a.group)
      const idxB = groupOptions.findIndex(o => o.value === b.group)
      const orderA = idxA === -1 ? 9999 : idxA
      const orderB = idxB === -1 ? 9999 : idxB
      return orderA - orderB
    })
    onChange(newEntries)
  }

  if (forbidden) {
    return (
      <Alert severity="warning" icon={<Lock fontSize="small" />} sx={{ mt: 2, borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600}>
          ACL設定は管理者のみ利用できます
        </Typography>
        <Typography variant="caption">
          グループ一覧の取得に必要な権限がありません。管理者グループのユーザーでログインしてください。
        </Typography>
      </Alert>
    )
  }

  return (
    <Box mt={2}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Lock fontSize="small" sx={{ color: blue[500] }} />
        <Typography variant="subtitle2" fontWeight={700}>
          ACL設定（グループ権限）
        </Typography>
        {aclEntries.length > 0 && (
          <Chip
            label={`${aclEntries.length}グループ`}
            size="small"
            sx={{ height: 18, fontSize: '0.65rem', bgcolor: blue[100], color: blue[900] }}
          />
        )}
      </Box>

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

      <Box mt={1.5}>
        {aclEntries.length === 0 ? (
          <Box
            sx={{ border: `1.5px dashed ${grey[300]}`, borderRadius: 2, p: 2, textAlign: 'center' }}
          >
            <Typography variant="caption" color={grey[400]}>
              グループを検索して権限を追加してください
            </Typography>
          </Box>
        ) : (
          aclEntries.map(entry => {
            const isAdmin = entry.group === '/_group/$admin'
            const opt = groupOptions.find(o => o.value === entry.group)
            const label = opt?.label ?? resolveGroupLabel(entry.group)
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

// ─── 作成/編集モーダル ─────────────────────────────────────────

const CreateModal = ({
  open,
  handleClose,
  create,
  afterCreate,
  entry
}: {
  open: boolean
  handleClose: () => void
  create: (params: {
    name: string
    name_jp?: string
    summary?: string
    other?: string
    contributor?: VtecxApp.Contributor[]
  }) => Promise<boolean | undefined>
  afterCreate: (success: boolean | undefined) => void
  entry?: VtecxApp.Entry
}) => {
  const [create_name, setCreateName] = React.useState('')
  const [name_jp, setNameJp] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [other, setOther] = React.useState('')
  const [aclEntries, setAclEntries] = React.useState<AclEntry[]>([])
  const [groupOptions, setGroupOptions] = React.useState<GroupOption[]>([])
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupsForbidden, setGroupsForbidden] = React.useState(false)
  const [nameValid, setNameValid] = React.useState<ValidationProps>({ error: true, message: '' })

  React.useEffect(() => {
    if (!open) return

    setCreateName(entry?.id?.split(',')[0].replace('/', '') ?? '')
    setNameJp(entry?.title ?? '')
    setSummary(entry?.content?.______text ?? '')
    setOther(entry?.summary ?? '')
    setNameValid({ error: !entry, message: '' })

    // 既存 contributor を解析
    const parsed: AclEntry[] = []
    if (entry?.contributor) {
      for (const c of entry.contributor) {
        if (c.uri) {
          const e = parseContributorUri(c.uri)
          if (e) parsed.push(e)
        }
      }
    }

    // $admin が含まれていなければデフォルトで CRUD を付与
    const adminEntry: AclEntry = {
      group: '/_group/$admin',
      permissions: { C: true, R: true, U: true, D: true, E: false }
    }
    const hasAdmin = parsed.some(e => e.group === '/_group/$admin')
    setAclEntries(hasAdmin ? parsed : [adminEntry, ...parsed])

    // グループ一覧取得
    setGroupsLoading(true)
    setGroupsForbidden(false)
    fetcher('/d/_group?f', 'get')
      .then(res => {
        const raw = res?.data
        const fetched: GroupOption[] = []
        if (Array.isArray(raw)) {
          raw.forEach((e: VtecxApp.Entry) => {
            const href = e.link?.[0]?.___href
            if (href && href !== '/_group/$admin') {
              fetched.push({
                value: href,
                label: DEFAULT_GROUP_LABELS[href] ?? href.replace(/^\/_group\//, ''),
                isSpecial: false
              })
            }
          })
        }
        // 並び順: * → + → $useradmin → $content → その他アルファベット昇順
        const ORDER: Record<string, number> = {
          '*': 0,
          '+': 1,
          '/_group/$useradmin': 2,
          '/_group/$content': 3
        }
        const all: GroupOption[] = [
          ...fetched,
          ...SPECIAL_GROUPS.filter(s => !fetched.some(f => f.value === s.value))
        ].sort((a, b) => {
          const oa = ORDER[a.value] ?? 100
          const ob = ORDER[b.value] ?? 100
          if (oa !== ob) return oa - ob
          return a.value.localeCompare(b.value)
        })
        setGroupOptions(all)
        setGroupsLoading(false)
      })
      .catch((err: any) => {
        setGroupsLoading(false)
        if (err?.response?.status === 403) {
          setGroupsForbidden(true)
        } else {
          // その他エラー：特殊グループのみ表示
          setGroupOptions([...SPECIAL_GROUPS])
        }
      })
  }, [open])

  const handleSave = async () => {
    if (!create_name) return
    const contributor: VtecxApp.Contributor[] = aclEntries
      .filter(e => Object.values(e.permissions).some(Boolean))
      .map(e => ({ uri: buildContributorUri(e) }))

    const success = await create({
      name: create_name,
      name_jp: name_jp || undefined,
      summary: summary || undefined,
      other: other || undefined,
      contributor: contributor.length > 0 ? contributor : undefined
    })
    afterCreate(success)
    handleClose()
  }

  const isEditing = Boolean(entry)

  // $admin 以外のエントリで「CRUDのどれも選択していない」または「Eのみ」は不可
  const hasInvalidAcl = aclEntries
    .filter(e => e.group !== '/_group/$admin')
    .some(e => {
      const { C, R, U, D } = e.permissions
      return !C && !R && !U && !D
    })

  const canSave = (isEditing || !nameValid.error) && !hasInvalidAcl

  return (
    <BasicModal open={open} handleClose={handleClose} data-testid="ep-modal">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="h6" fontWeight={700}>
          {isEditing ? 'エンドポイント編集' : 'エンドポイント新規作成'}
        </Typography>
      </Box>

      <Box component="form" noValidate autoComplete="off">
        <TextField
          label="エンドポイント"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'data-testid': 'ep-name-input' }
          }}
          fullWidth
          value={create_name}
          placeholder="半角英数とアンダーバー(_)が使用可能です。"
          onChange={e => {
            setNameValid(validation('endpoint', e.target.value))
            setCreateName(e.target.value)
          }}
          error={!isEditing && nameValid.error && create_name !== ''}
          disabled={isEditing}
          sx={{ mt: 3 }}
        />
        {!isEditing && nameValid.error && nameValid.message && create_name !== '' && (
          <Typography variant="caption" color="error" data-testid="ep-name-error">
            {nameValid.message}
          </Typography>
        )}

        <TextField
          label="エンドポイント（日本語）"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          value={name_jp}
          onChange={e => setNameJp(e.target.value)}
          sx={{ mt: 3 }}
        />
        <TextField
          label="詳細説明"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          multiline
          rows={2}
          value={summary}
          placeholder="エンドポイントの説明などを入力してください。"
          onChange={e => setSummary(e.target.value)}
          sx={{ mt: 3 }}
        />
        <TextField
          label="その他の説明"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          multiline
          rows={2}
          value={other}
          placeholder="備考やスキーマ情報などを記述しておくと便利です。"
          onChange={e => setOther(e.target.value)}
          sx={{ mt: 3 }}
        />

        <Divider sx={{ mt: 3 }} />

        <AclEditor
          aclEntries={aclEntries}
          onChange={setAclEntries}
          groupOptions={groupOptions}
          loading={groupsLoading}
          forbidden={groupsForbidden}
        />

        <Box display="flex" justifyContent="flex-end" gap={1.5} mt={3}>
          <Button color="inherit" variant="outlined" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleSave}
            startIcon={isEditing ? <Edit /> : <Add />}
            disabled={!canSave}
            data-testid="ep-save-button"
          >
            {isEditing ? '更新' : '新規作成'}
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

// ─── 一覧の権限バッジ ─────────────────────────────────────────

const AclBadges: React.FC<{ contributors?: VtecxApp.Contributor[] }> = ({ contributors }) => {
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
        const label = resolveGroupLabel(parsed.group)
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

// ─── メインコンポーネント ─────────────────────────────────────

const Endpoint = () => {
  const { list, get: getEndpoint, post: createEndpoint, deleteEndpoint } = useEndpoint()

  const [edit_entry, setEditEntry] = React.useState<VtecxApp.Entry | undefined>()
  const [show_create_modal, setShowCreateModal] = React.useState(false)
  const [entry, setEntry] = React.useState<VtecxApp.Entry[]>([])
  const [dialog, setDialog] = React.useState(false)
  const [delete_name, setDeleteeName] = React.useState<string | undefined>()
  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  React.useEffect(() => {
    const sorted = [...(list ?? [])].sort((a, b) => {
      const ua = a.id?.startsWith('/_') ?? false
      const ub = b.id?.startsWith('/_') ?? false
      if (ua !== ub) return ua ? 1 : -1
      return (a.id ?? '') < (b.id ?? '') ? -1 : 1
    })
    setEntry(sorted)
  }, [list])

  const afterCreate = React.useCallback(
    (success: boolean | undefined) => {
      const label = edit_entry ? '更新' : '作成'
      if (success) {
        getEndpoint()
        setMesseage({ type: 'info', value: `エンドポイントを${label}しました。` })
        setTimeout(() => setMesseage(undefined), 10000)
      } else {
        setMesseage({
          type: 'error',
          value: `エンドポイントの${label}に失敗しました。もう一度お試しください。`
        })
      }
    },
    [edit_entry]
  )

  const afterDelete = React.useCallback(async () => {
    const success = await deleteEndpoint(delete_name)
    if (success) {
      getEndpoint()
      setMesseage({ type: 'info', value: `${delete_name}を削除しました。` })
      setTimeout(() => setMesseage(undefined), 10000)
    } else {
      setMesseage({ type: 'error', value: `${delete_name}の削除に失敗しました。` })
    }
    setDialog(false)
  }, [delete_name])

  return (
    <MainContainer
      title="エンドポイント管理"
      action={
        <>
          <Tooltip title="Reload data" placement="top" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={getEndpoint}>
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => {
              setEditEntry(undefined)
              setShowCreateModal(true)
            }}
            sx={{ display: { xs: 'inherit', md: 'none' } }}
            data-testid="add-ep-button"
          >
            <Add />
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditEntry(undefined)
              setShowCreateModal(true)
            }}
            sx={{ display: { xs: 'none', md: 'inherit' } }}
            data-testid="add-ep-button"
          >
            追加
          </Button>
          <CreateModal
            open={show_create_modal}
            handleClose={() => setShowCreateModal(false)}
            create={createEndpoint}
            afterCreate={afterCreate}
            entry={edit_entry}
          />
          <CopyCommandMenu
            menu={[
              { label: 'download', value: 'npx vtecxutil download:folderacls' },
              { label: 'upload', value: 'npx vtecxutil upload:folderacls' }
            ]}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <TableContainer component={Paper} hidden={entry.length === 0} data-testid="ep-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left" data-testid="ep-col-name">
                エンドポイント
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                説明
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                権限
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {entry.map((ep: VtecxApp.Entry) => {
              const endpoint_name = ep.id?.split(',')[0] ?? ''
              const is_service = endpoint_name.startsWith('/_')
              const row_testid = 'ep-row-' + endpoint_name.replace(/^\//, '')
              return (
                <TableRow
                  key={ep.id}
                  hover
                  sx={{ backgroundColor: is_service ? grey[100] : undefined }}
                  data-testid={row_testid}
                >
                  <TableCell align="left">
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        maxWidth: { xs: '300px', md: '500px' }
                      }}
                      gutterBottom
                    >
                      {endpoint_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="div"
                      color={grey[600]}
                      sx={{ overflowWrap: 'break-word', maxWidth: { xs: '300px', md: '500px' } }}
                    >
                      {ep.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{ overflowWrap: 'break-word', maxWidth: 400 }}
                      gutterBottom
                    >
                      {ep.content?.______text}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{ overflowWrap: 'break-word', maxWidth: 400 }}
                    >
                      {ep.summary}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <AclBadges contributors={ep.contributor} />
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {!is_service && (
                      <>
                        <Button
                          onClick={() => {
                            setEditEntry(ep)
                            setShowCreateModal(true)
                          }}
                          data-testid="edit-button"
                        >
                          編集
                        </Button>
                        <Button
                          color="error"
                          onClick={() => {
                            setMesseage(undefined)
                            setDeleteeName(endpoint_name)
                            setDialog(true)
                          }}
                          data-testid="delete-button"
                        >
                          削除
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <AlertDialog
        title={`${delete_name}を削除しますか？`}
        open={dialog}
        onAgree={afterDelete}
        handleClose={() => setDialog(false)}
      >
        エンドポイント削除後は復旧することはできません。エンドポイント配下にあるデータも削除します。
      </AlertDialog>
    </MainContainer>
  )
}

export default Endpoint
