import React from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import { Add, Edit, Close } from '@mui/icons-material'
import { grey, blue, red } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import { fetcher } from '../../../../../../utils/fetcher'
import dayjs from 'dayjs'
import {
  AclEntry,
  GroupOption,
  CustomField,
  DEFAULT_ACL,
  COMMON_FIELDS,
  sortSchemaGroups,
  sortCardFields,
  parseContributorUri,
  buildContributorUri,
  parseSchemaValue,
  SPECIAL_GROUPS,
  DEFAULT_GROUP_LABELS
} from '../../types'
import { AclEditor } from '../acl/AclEditor'
import { SchemaFieldSearch } from '../schema/SchemaFieldSearch'
import { SchemaFieldInput } from '../schema/SchemaFieldInput'

export const EntryFormModal: React.FC<{
  open: boolean
  onClose: () => void
  parentPath?: string
  editEntry?: VtecxApp.Entry
  onSuccess: () => void
}> = ({ open, onClose, parentPath, editEntry, onSuccess }) => {
  const isEdit = Boolean(editEntry)
  const baseKey = editEntry
    ? (editEntry.link?.find(l => l.___rel === 'self')?.___href ?? editEntry.id?.split(',')[0] ?? '')
    : (parentPath ?? '/')

  // ── キー ──
  const [keyInput, setKeyInput] = React.useState('')
  const [keyError, setKeyError] = React.useState<string | undefined>()
  const [keyChecking, setKeyChecking] = React.useState(false)
  const keyValid = keyInput === '' || /^[a-zA-Z0-9_$][a-zA-Z0-9_$-]*$/.test(keyInput)
  const fullKey = keyInput ? `${baseKey === '/' ? '' : baseKey}/${keyInput}` : ''

  // ── ACL ──
  const [aclEntries, setAclEntries] = React.useState<AclEntry[]>([...DEFAULT_ACL])
  const [groupOptions, setGroupOptions] = React.useState<GroupOption[]>([])
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupsForbidden, setGroupsForbidden] = React.useState(false)

  // ── カスタムフィールド（共通スキーマ含む） ──
  const [customFields, setCustomFields] = React.useState<CustomField[]>([])

  // ── 送信状態 ──
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | undefined>()
  // ── ステップ ──
  const [step, setStep] = React.useState(0)
  const STEPS = isEdit ? ['スキーマ', 'ACL設定'] : ['キー', 'スキーマ', 'ACL設定']

  // 編集時に既存値をセット＆グループ一覧取得
  React.useEffect(() => {
    if (!open) return
    setStep(0)
    if (isEdit && editEntry) {
      setKeyInput('')
      // ACL
      const parsed: AclEntry[] = (editEntry.contributor ?? [])
        .map(c => (c.uri?.startsWith('urn:vte.cx:acl:') ? parseContributorUri(c.uri!) : null))
        .filter((x): x is AclEntry => x !== null)
      const hasAdmin = parsed.some(e => e.group === '/_group/$admin')
      setAclEntries(hasAdmin ? parsed : [...DEFAULT_ACL, ...parsed])
      // 共通スキーマ + カスタムフィールドを customFields に統合
      const std = new Set(['id', 'link', 'contributor', 'published', 'updated', 'author'])
      const cf: CustomField[] = []
      // 共通スキーマ
      if (editEntry.title)
        cf.push({
          parentKey: '',
          fieldKey: 'title',
          fullKey: 'title',
          type: 'string',
          label: 'タイトル',
          value: editEntry.title
        })
      if (editEntry.subtitle)
        cf.push({
          parentKey: '',
          fieldKey: 'subtitle',
          fullKey: 'subtitle',
          type: 'string',
          label: 'サブタイトル',
          value: editEntry.subtitle
        })
      if (editEntry.summary)
        cf.push({
          parentKey: '',
          fieldKey: 'summary',
          fullKey: 'summary',
          type: 'string',
          label: 'サマリ',
          value: editEntry.summary
        })
      if (editEntry.rights)
        cf.push({
          parentKey: '',
          fieldKey: 'rights',
          fullKey: 'rights',
          type: 'string',
          label: 'ライツ',
          value: editEntry.rights
        })
      if (editEntry.content?.______text)
        cf.push({
          parentKey: '',
          fieldKey: 'content',
          fullKey: 'content',
          type: 'string',
          label: 'コンテンツ',
          value: editEntry.content.______text
        })
      // カスタムフィールド（ネスト展開）
      Object.entries(editEntry)
        .filter(([k]) => !std.has(k) && !COMMON_FIELDS.has(k))
        .forEach(([k, v]) => {
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            Object.entries(v as Record<string, any>).forEach(([ck, cv]) => {
              cf.push({
                parentKey: k,
                fieldKey: ck,
                fullKey: `${k}.${ck}`,
                type: '',
                label: `${k}.${ck}`,
                value: typeof cv === 'object' ? JSON.stringify(cv) : String(cv ?? '')
              })
            })
          } else {
            cf.push({
              parentKey: '',
              fieldKey: k,
              fullKey: k,
              type: '',
              label: k,
              value: String(v ?? '')
            })
          }
        })
      setCustomFields(cf)
    } else {
      setKeyInput('')
      setKeyError(undefined)
      setAclEntries([...DEFAULT_ACL])
      setCustomFields([])
    }
    setSubmitError(undefined)

    // グループ一覧取得（CreateModal と同じロジック）
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
          setGroupOptions([...SPECIAL_GROUPS])
        }
      })
  }, [open, isEdit])

  // キー重複チェック
  const handleKeyBlur = async () => {
    if (!keyInput || !keyValid) return
    setKeyChecking(true)
    setKeyError(undefined)
    // 親キー + 入力値でチェック URL を組み立て
    const checkPath = baseKey === '/' ? `/${keyInput}` : `${baseKey}/${keyInput}`
    try {
      const res = await fetcher(`/d${checkPath}?e`, 'get')
      if (res.status === 204) {
        // 204 = データなし → 重複なし
        setKeyError(undefined)
      } else {
        setKeyError('このキーは既に使用されています。')
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setKeyError(undefined)
      } else if (err?.response?.status !== 204) {
        setKeyError('このキーは既に使用されています。')
      }
    } finally {
      setKeyChecking(false)
    }
  }

  const isRoot = baseKey === '/'
  const canSubmit = !keyError && !keyChecking && keyValid && customFields.every(cf => !cf.error)

  const buildEntry = (): VtecxApp.Entry => {
    const links: VtecxApp.Link[] = []
    if (keyInput) {
      links.push({ ___href: fullKey, ___rel: 'self' })
    }

    const contributor: VtecxApp.Contributor[] = aclEntries
      .filter(e => Object.values(e.permissions).some(Boolean))
      .map(e => ({ uri: buildContributorUri(e) }))

    const entry: VtecxApp.Entry = {}
    if (links.length > 0) entry.link = links
    if (contributor.length > 0) entry.contributor = contributor

    // customFields から共通スキーマ・カスタムスキーマ両方を構築
    customFields.forEach(cf => {
      const val = cf.value === '' ? undefined : parseSchemaValue(cf.value, cf.type)
      if (COMMON_FIELDS.has(cf.fullKey)) {
        if (cf.fullKey === 'content') {
          ;(entry as any).content = val !== undefined ? { ______text: cf.value } : undefined
        } else {
          ;(entry as any)[cf.fullKey] = val
        }
      } else {
        const keys = cf.fullKey.split('.')
        let cur: any = entry
        for (let i = 0; i < keys.length - 1; i++) {
          if (cur[keys[i]] === undefined || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
          cur = cur[keys[i]]
        }
        cur[keys[keys.length - 1]] = val
      }
    })

    return entry
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      let url: string
      if (isEdit) {
        url = `/d/`
      } else {
        url = keyInput ? `/d/` : `/d${baseKey === '/' ? '' : baseKey}`
      }
      await fetcher(url, isEdit ? 'put' : 'post', [buildEntry()])
      onSuccess()
      onClose()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.feed?.title ?? 'エラーが発生しました。')
    } finally {
      setSubmitting(false)
    }
  }

  // 読み取り専用フィールド（編集時、入力項目にないデータ）
  const readonlyFields =
    isEdit && editEntry
      ? [
          { label: 'ID', value: editEntry.id },
          {
            label: '作成日時',
            value: editEntry.published
              ? dayjs(editEntry.published).format('YYYY/MM/DD HH:mm:ss')
              : undefined
          },
          {
            label: '更新日時',
            value: editEntry.updated
              ? dayjs(editEntry.updated).format('YYYY/MM/DD HH:mm:ss')
              : undefined
          }
        ].filter(f => f.value)
      : []

  const groupedCustomFields = React.useMemo(() => {
    const map: Record<string, CustomField[]> = {}
    customFields.forEach(cf => {
      const key = cf.parentKey || '__root__'
      if (!map[key]) map[key] = []
      map[key].push(cf)
    })
    // __root__ を先頭に、各カード内フィールドをソート
    return Object.fromEntries(
      sortSchemaGroups(Object.entries(map)).map(([k, fields]) => [
        k,
        sortCardFields(fields, k === '__root__')
      ])
    )
  }, [customFields])
  const hasSchemaError = customFields.some(cf => cf.error)

  const canNext = React.useMemo(() => {
    if (isEdit) {
      if (step === 0) return !hasSchemaError // スキーマ
      if (step === 1) return canSubmit // ACL
    } else {
      if (step === 0) {
        const keyOk = !keyError && !keyChecking && keyValid
        if (isRoot) return keyOk && keyInput.trim() !== '' // ルートはキー必須
        return keyOk
      }
      if (step === 1) return !hasSchemaError // スキーマ
      if (step === 2) return canSubmit // ACL
    }
    return true
  }, [isEdit, step, keyError, keyChecking, keyValid, keyInput, isRoot, canSubmit, hasSchemaError])

  const isLastStep = step === STEPS.length - 1

  // ステップインデックス（追加と編集で異なる）
  const showKeyStep = !isEdit ? step === 0 : false
  const showBasicStep = !isEdit ? step === 1 : step === 0
  const showAclStep = !isEdit ? step === 2 : step === 1

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1, pb: 1 }}>
        <Box flex={1}>
          {isEdit ? '編集' : '追加'}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1, fontFamily: 'monospace' }}
          >
            {isEdit ? baseKey : `${baseKey === '/' ? '' : baseKey}/...`}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ステッパー */}
      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent
        dividers
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 320 }}
      >
        {isEdit && readonlyFields.length > 0 && (
          <Box
            sx={{ bgcolor: grey[50], borderRadius: 1, p: 1.5, border: `1px solid ${grey[200]}` }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color={grey[500]}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                mb: 0.75
              }}
            >
              参照情報
            </Typography>
            {readonlyFields.map(f => (
              <Box key={f.label} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: grey[400], minWidth: 80, flexShrink: 0 }}
                >
                  {f.label}
                </Typography>
                <Typography variant="caption" sx={{ color: grey[700], fontFamily: 'monospace' }}>
                  {f.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* ── 前ステップのサマリー表示 ── */}
        {step > 0 && (
          <Box
            sx={{ bgcolor: grey[50], border: `1px solid ${grey[200]}`, borderRadius: 1, p: 1.5 }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color={grey[500]}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}
            >
              入力確認
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                rowGap: 0.75,
                columnGap: 2,
                alignItems: 'baseline'
              }}
            >
              {/* キー（追加時のみ） */}
              {!isEdit && (
                <>
                  <Typography variant="caption" sx={{ color: grey[400], fontWeight: 600 }}>
                    キー
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: grey[700], fontFamily: 'monospace', wordBreak: 'break-all' }}
                  >
                    {keyInput
                      ? `${baseKey === '/' ? '' : baseKey}/${keyInput}`
                      : `${baseKey === '/' ? '/' : baseKey}/（自動生成）`}
                  </Typography>
                </>
              )}

              {/* スキーマデータ（ACLステップのみ） */}
              {showAclStep &&
                customFields
                  .filter(cf => cf.value !== '')
                  .map(cf => (
                    <React.Fragment key={cf.fullKey}>
                      <Typography
                        variant="caption"
                        sx={{ color: grey[400], fontWeight: 600, fontFamily: 'monospace' }}
                      >
                        {cf.fullKey}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: grey[700],
                          wordBreak: 'break-all',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 40,
                          overflow: 'hidden'
                        }}
                      >
                        {cf.value}
                      </Typography>
                    </React.Fragment>
                  ))}
            </Box>
          </Box>
        )}

        {/* ── STEP: キー ── */}
        {showKeyStep && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                キー（任意）
              </Typography>
            </Box>
            <TextField
              size="small"
              fullWidth
              placeholder="半角英数・_・$・- が使用可能"
              value={keyInput}
              onChange={e => {
                setKeyInput(e.target.value)
                setKeyError(undefined)
              }}
              onBlur={handleKeyBlur}
              error={!keyValid || Boolean(keyError)}
              helperText={
                !keyValid
                  ? 'vte.cxのキーに使用できない文字が含まれています。'
                  : keyError
                    ? keyError
                    : keyChecking
                      ? '確認中...'
                      : isRoot
                        ? 'ルート直下への追加はキーが必須です。'
                        : '省略した場合、サーバーがキーを自動生成します。'
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography
                        variant="body2"
                        sx={{
                          color: grey[500],
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                          userSelect: 'none'
                        }}
                      >
                        {baseKey === '/' ? '/' : `${baseKey}/`}
                      </Typography>
                    </InputAdornment>
                  ),
                  endAdornment: keyChecking ? <CircularProgress size={14} /> : undefined
                }
              }}
            />
          </Box>
        )}

        {/* ── STEP: スキーマ ── */}
        {showBasicStep && (
          <>
            <SchemaFieldSearch
              onAdd={fields => setCustomFields(prev => [...prev, ...fields])}
              existingParents={Object.keys(groupedCustomFields).filter(k => k !== '__root__')}
              existingFullKeys={customFields.map(cf => cf.fullKey)}
              showCommon
            />
            {Object.entries(groupedCustomFields).map(([parentKey, fields]) => (
              <Box
                key={parentKey}
                sx={{ border: `1px solid ${grey[200]}`, borderRadius: 1, p: 1.5 }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ fontFamily: 'monospace', color: blue[700] }}
                  >
                    {parentKey === '__root__' ? '(ルート)' : parentKey}
                  </Typography>
                  {parentKey !== '__root__' && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCustomFields(prev => prev.filter(cf => cf.parentKey !== parentKey))
                      }}
                      sx={{ color: red[300] }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                {fields.map(cf => (
                  <SchemaFieldInput
                    key={cf.fullKey}
                    cf={cf}
                    onChange={(val, err) =>
                      setCustomFields(prev =>
                        prev.map(f =>
                          f.fullKey === cf.fullKey ? { ...f, value: val, error: err } : f
                        )
                      )
                    }
                    onRemove={() =>
                      setCustomFields(prev => prev.filter(f => f.fullKey !== cf.fullKey))
                    }
                  />
                ))}
              </Box>
            ))}
          </>
        )}

        {/* ── STEP: ACL ── */}
        {showAclStep && (
          <AclEditor
            aclEntries={aclEntries}
            onChange={setAclEntries}
            groupOptions={groupOptions}
            loading={groupsLoading}
            forbidden={groupsForbidden}
          />
        )}

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        {step > 0 && (
          <Button variant="outlined" onClick={() => setStep(s => s - 1)}>
            戻る
          </Button>
        )}
        {!isLastStep ? (
          <Button
            variant="contained"
            onClick={async () => {
              // キーステップでは次へ前にblurチェックを実行
              if (showKeyStep && keyInput && keyValid && !keyError) {
                await handleKeyBlur()
              }
              setStep(s => s + 1)
            }}
            disabled={!canNext}
          >
            次へ
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            startIcon={submitting ? <CircularProgress size={14} /> : isEdit ? <Edit /> : <Add />}
          >
            {isEdit ? '更新' : '追加'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── スキーマ専用編集モーダル ────────────────────────────────────
