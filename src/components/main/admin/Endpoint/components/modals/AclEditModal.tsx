import React from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material'
import { Edit, Close } from '@mui/icons-material'
import VtecxApp from '../../../../../../typings'
import { fetcher } from '../../../../../../utils/fetcher'
import {
  AclEntry,
  GroupOption,
  DEFAULT_ACL,
  parseContributorUri,
  buildContributorUri,
  SPECIAL_GROUPS,
  DEFAULT_GROUP_LABELS
} from '../../types'
import { AclEditor } from '../acl/AclEditor'

export const AclEditModal: React.FC<{
  open: boolean
  onClose: () => void
  entry: VtecxApp.Entry
  onSuccess: () => void
}> = ({ open, onClose, entry, onSuccess }) => {
  const entryKey =
    entry.link?.find(l => l.___rel === 'self')?.___href ?? entry.id?.split(',')[0] ?? ''
  const [aclEntries, setAclEntries] = React.useState<AclEntry[]>([...DEFAULT_ACL])
  const [groupOptions, setGroupOptions] = React.useState<GroupOption[]>([])
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupsForbidden, setGroupsForbidden] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (!open) return
    const parsed: AclEntry[] = (entry.contributor ?? [])
      .map(c => (c.uri?.startsWith('urn:vte.cx:acl:') ? parseContributorUri(c.uri!) : null))
      .filter((x): x is AclEntry => x !== null)
    const hasAdmin = parsed.some(e => e.group === '/_group/$admin')
    setAclEntries(hasAdmin ? parsed : [...DEFAULT_ACL, ...parsed])
    setSubmitError(undefined)
    setGroupsLoading(true)
    setGroupsForbidden(false)
    fetcher('/d/_group?f', 'get')
      .then(res => {
        const raw = res?.data
        const fetched: GroupOption[] = []
        if (Array.isArray(raw))
          raw.forEach((e: VtecxApp.Entry) => {
            const href = e.link?.[0]?.___href
            if (href && href !== '/_group/$admin')
              fetched.push({
                value: href,
                label: DEFAULT_GROUP_LABELS[href] ?? href.replace(/^\/_group\//, ''),
                isSpecial: false
              })
          })
        const ORDER: Record<string, number> = {
          '*': 0,
          '+': 1,
          '/_group/$useradmin': 2,
          '/_group/$content': 3
        }
        setGroupOptions(
          [...fetched, ...SPECIAL_GROUPS.filter(s => !fetched.some(f => f.value === s.value))].sort(
            (a, b) => {
              const oa = ORDER[a.value] ?? 100
              const ob = ORDER[b.value] ?? 100
              return oa !== ob ? oa - ob : a.value.localeCompare(b.value)
            }
          )
        )
        setGroupsLoading(false)
      })
      .catch((err: any) => {
        setGroupsLoading(false)
        if (err?.response?.status === 403) setGroupsForbidden(true)
        else setGroupOptions([...SPECIAL_GROUPS])
      })
  }, [open])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const contributor = aclEntries
        .filter(e => Object.values(e.permissions).some(Boolean))
        .map(e => ({ uri: buildContributorUri(e) }))
      const updated: VtecxApp.Entry = {
        ...entry,
        contributor: contributor.length > 0 ? contributor : undefined
      }
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Box flex={1}>
          <Typography fontWeight={700}>権限 (ACL) 編集</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {entryKey}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <AclEditor
          aclEntries={aclEntries}
          onChange={setAclEntries}
          groupOptions={groupOptions}
          loading={groupsLoading}
          forbidden={groupsForbidden}
        />
        {submitError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {submitError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={submitting}
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={14} /> : <Edit />}
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  )
}
