import React from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { Edit, Close } from '@mui/icons-material'
import { grey, blue, red } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import { fetcher } from '../../../../../../utils/fetcher'
import { CustomField, sortSchemaGroups, sortCardFields, parseSchemaValue } from '../../types'
import { SchemaFieldSearch } from '../schema/SchemaFieldSearch'
import { SchemaFieldInput } from '../schema/SchemaFieldInput'

export const SchemaEditModal: React.FC<{
  open: boolean
  onClose: () => void
  entry: VtecxApp.Entry
  onSuccess: () => void
}> = ({ open, onClose, entry, onSuccess }) => {
  const entryKey =
    entry.link?.find(l => l.___rel === 'self')?.___href ?? entry.id?.split(',')[0] ?? ''
  const [customFields, setCustomFields] = React.useState<CustomField[]>([])
  const [schemaList, setSchemaList] = React.useState<
    { path: string; type: string; indent: number }[]
  >([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (!open) return
    const COMMON = new Set(['title', 'subtitle', 'summary', 'rights', 'content'])
    const std = new Set(['id', 'link', 'contributor', 'published', 'updated', 'author'])

    // 共通スキーマの初期フィールドを先に構築
    const commonFields: CustomField[] = []
    if (entry.title)
      commonFields.push({
        parentKey: '',
        fieldKey: 'title',
        fullKey: 'title',
        type: 'string',
        label: 'タイトル',
        value: entry.title
      })
    if (entry.subtitle)
      commonFields.push({
        parentKey: '',
        fieldKey: 'subtitle',
        fullKey: 'subtitle',
        type: 'string',
        label: 'サブタイトル',
        value: entry.subtitle
      })
    if (entry.summary)
      commonFields.push({
        parentKey: '',
        fieldKey: 'summary',
        fullKey: 'summary',
        type: 'string',
        label: 'サマリ',
        value: entry.summary
      })
    if (entry.rights)
      commonFields.push({
        parentKey: '',
        fieldKey: 'rights',
        fullKey: 'rights',
        type: 'string',
        label: 'ライツ',
        value: entry.rights
      })
    if (entry.content?.______text)
      commonFields.push({
        parentKey: '',
        fieldKey: 'content',
        fullKey: 'content',
        type: 'string',
        label: 'コンテンツ',
        value: entry.content.______text
      })

    // テンプレートから型情報を取得してフィールドに反映
    fetcher('/d/_settings/template?e', 'get')
      .then(res => {
        const text: string = res?.data?.content?.______text ?? ''
        const lines = text.split('\n').filter((l: string) => l.trim())
        const stack: { indent: number; path: string }[] = []
        const typeMap: Record<string, string> = {}
        const parsed: { path: string; type: string; indent: number }[] = []
        lines.forEach((line: string) => {
          const indent = line.match(/^ */)?.[0].length || 0
          const trimmed = line.trim()
          const name = trimmed.split(/[(!{=]/)[0]
          const typeMatch = trimmed.match(/\(([^)]+)\)/)
          const type = typeMatch ? typeMatch[1] : ''
          while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
          const parentPath = stack.length > 0 ? stack[stack.length - 1].path : ''
          const fullPath = parentPath ? `${parentPath}.${name}` : name
          stack.push({ indent, path: fullPath })
          if (type) typeMap[fullPath] = type
          parsed.push({ path: fullPath, type, indent })
        })
        setSchemaList(parsed)

        // ネストオブジェクトを CustomField に展開（型情報付き）
        const fields: CustomField[] = [...commonFields]
        Object.entries(entry)
          .filter(([k]) => !std.has(k) && !COMMON.has(k))
          .forEach(([k, v]) => {
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              Object.entries(v as Record<string, any>).forEach(([childKey, childVal]) => {
                const fullKey = `${k}.${childKey}`
                fields.push({
                  parentKey: k,
                  fieldKey: childKey,
                  fullKey,
                  type: typeMap[fullKey] ?? '',
                  label: fullKey,
                  value:
                    typeof childVal === 'object' ? JSON.stringify(childVal) : String(childVal ?? '')
                })
              })
            } else {
              fields.push({
                parentKey: '',
                fieldKey: k,
                fullKey: k,
                type: typeMap[k] ?? '',
                label: k,
                value: String(v ?? '')
              })
            }
          })
        setCustomFields(fields)
      })
      .catch(() => {
        // テンプレート取得失敗時は型なしで展開
        const fields: CustomField[] = [...commonFields]
        Object.entries(entry)
          .filter(([k]) => !std.has(k) && !COMMON.has(k))
          .forEach(([k, v]) => {
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              Object.entries(v as Record<string, any>).forEach(([childKey, childVal]) => {
                fields.push({
                  parentKey: k,
                  fieldKey: childKey,
                  fullKey: `${k}.${childKey}`,
                  type: '',
                  label: `${k}.${childKey}`,
                  value:
                    typeof childVal === 'object' ? JSON.stringify(childVal) : String(childVal ?? '')
                })
              })
            } else {
              fields.push({
                parentKey: '',
                fieldKey: k,
                fullKey: k,
                type: '',
                label: k,
                value: String(v ?? '')
              })
            }
          })
        setCustomFields(fields)
      })
    setSubmitError(undefined)
  }, [open])

  const groupedCustomFields = React.useMemo(() => {
    const map: Record<string, CustomField[]> = {}
    customFields.forEach(cf => {
      const k = cf.parentKey || '__root__'
      if (!map[k]) map[k] = []
      map[k].push(cf)
    })
    return Object.fromEntries(
      sortSchemaGroups(Object.entries(map)).map(([k, fields]) => [
        k,
        sortCardFields(fields, k === '__root__')
      ])
    )
  }, [customFields])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const COMMON = new Set(['title', 'subtitle', 'summary', 'rights', 'content'])
      const std = new Set(['id', 'link', 'contributor', 'published', 'updated', 'author'])
      // link/contributor/published/updated/author のみ保持したベースを作成
      const base: VtecxApp.Entry = {}
      Object.entries(entry).forEach(([k, v]) => {
        if (std.has(k)) (base as any)[k] = v
      })

      // customFields から共通・カスタム両方を構築
      customFields.forEach(cf => {
        const val = cf.value === '' ? undefined : parseSchemaValue(cf.value, cf.type)
        if (COMMON.has(cf.fullKey)) {
          if (cf.fullKey === 'content') {
            ;(base as any).content = val !== undefined ? { ______text: cf.value } : undefined
          } else {
            ;(base as any)[cf.fullKey] = val
          }
        } else {
          const keys = cf.fullKey.split('.')
          let cur: any = base
          for (let i = 0; i < keys.length - 1; i++) {
            if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
            cur = cur[keys[i]]
          }
          cur[keys[keys.length - 1]] = val
        }
      })
      await fetcher(`/d/`, 'put', [base])
      onSuccess()
      onClose()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.feed?.title ?? 'エラーが発生しました。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Box flex={1}>
          <Typography fontWeight={700}>スキーマ編集</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {entryKey}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 320 }}
      >
        <SchemaFieldSearch
          onAdd={fields => setCustomFields(prev => [...prev, ...fields])}
          existingParents={Object.keys(groupedCustomFields).filter(k => k !== '__root__')}
          existingFullKeys={customFields.map(cf => cf.fullKey)}
          showCommon
          externalSchemaList={schemaList}
        />
        {Object.entries(groupedCustomFields).map(([parentKey, fields]) => (
          <Box key={parentKey} sx={{ border: `1px solid ${grey[200]}`, borderRadius: 1, p: 1.5 }}>
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
                    prev.map(f => (f.fullKey === cf.fullKey ? { ...f, value: val, error: err } : f))
                  )
                }
                onRemove={() => setCustomFields(prev => prev.filter(f => f.fullKey !== cf.fullKey))}
              />
            ))}
          </Box>
        ))}
        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={submitting || customFields.some(cf => cf.error)}
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={14} /> : <Edit />}
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── ACL専用編集モーダル ─────────────────────────────────────────
