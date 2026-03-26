import React from 'react'
import { Box, Typography, IconButton, Link, Tooltip } from '@mui/material'
import { Add, Refresh, DeleteOutline, InsertDriveFile, ArrowBack } from '@mui/icons-material'
import { grey, blue, teal } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import AlertDialog from '../../../../../parts/Dialog'
import { BasicInfoSection } from './BasicInfoSection'
import { AclSection } from '../acl/AclEditor'
import { SchemaEditModal } from '../modals/SchemaEditModal'
import { AclEditModal } from '../modals/AclEditModal'
import { AliasEditModal } from '../modals/AliasEditModal'

// ─── 共通ヘッダ
export const DetailHeader: React.FC<{
  entry: VtecxApp.Entry
  onClose: () => void
  onAdd?: () => void
  onDelete?: () => void
  onRefresh?: () => void
}> = ({ entry, onClose, onAdd, onDelete, onRefresh }) => {
  const key = entry.link?.[0]?.___href ?? entry.id?.split(',')[0] ?? ''
  const isSystem = key.startsWith('/_')
  return (
    <Box
      sx={{
        p: 1.5,
        borderBottom: `1px solid ${grey[200]}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: grey[50],
        flexShrink: 0,
        flexWrap: 'wrap'
      }}
    >
      <InsertDriveFile sx={{ color: teal[600], fontSize: 20, flexShrink: 0 }} />
      <Box flex={1} minWidth={0}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          noWrap
          sx={{ fontFamily: entry.title ? undefined : 'monospace' }}
        >
          {entry.title ?? key}
        </Typography>
        {entry.title && (
          <Typography
            variant="caption"
            sx={{ color: grey[500], fontFamily: 'monospace', display: 'block' }}
            noWrap
          >
            {key}
          </Typography>
        )}
      </Box>
      <Box display="flex" gap={0.75} flexShrink={0}>
        {!isSystem && onAdd && (
          <Tooltip title="追加">
            <IconButton size="small" onClick={onAdd} sx={{ color: 'success.main' }}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onRefresh && (
          <IconButton size="small" onClick={onRefresh}>
            <Refresh fontSize="small" />
          </IconButton>
        )}
        {!isSystem && onDelete && (
          <Tooltip title="削除">
            <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={onClose}>
          <ArrowBack fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

// ─── 行クリック用: 左=詳細情報、右=権限(狭) の2カラムレイアウト ────

export const EntryDetailPanel: React.FC<{
  entry: VtecxApp.Entry
  onClose: () => void
  onDelete?: (key: string) => void
  onRefresh?: () => void
  onNavigate?: (path: string) => void
  showHeader?: boolean
}> = ({ entry, onClose, onDelete, onRefresh, onNavigate, showHeader = true }) => {
  const [deleteDialog, setDeleteDialog] = React.useState(false)
  const [schemaEditOpen, setSchemaEditOpen] = React.useState(false)
  const [aclEditOpen, setAclEditOpen] = React.useState(false)
  const [aliasEditOpen, setAliasEditOpen] = React.useState(false)
  const key = entry.link?.[0]?.___href ?? entry.id?.split(',')[0] ?? ''
  const isSystem = key.startsWith('/_')

  const EditLink: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <Link
      component="button"
      variant="caption"
      underline="hover"
      onClick={onClick}
      sx={{ color: blue[600], cursor: 'pointer', fontSize: '0.7rem' }}
    >
      追加・変更
    </Link>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {showHeader && (
        <DetailHeader
          entry={entry}
          onClose={onClose}
          onDelete={onDelete ? () => setDeleteDialog(true) : undefined}
          onRefresh={onRefresh}
        />
      )}
      {/* 2カラムボディ */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左: 基本情報 + スキーマ */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            borderRight: `1px solid ${grey[100]}`,
            px: 2,
            pt: 1.5,
            pb: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <BasicInfoSection entry={entry} onNavigate={onNavigate} basicOnly />
          <Box>
            <Box display="flex" alignItems="center" mb={0.5}>
              <Typography
                variant="caption"
                fontWeight={700}
                color={grey[500]}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}
              >
                スキーマ
              </Typography>
              {!isSystem && <EditLink onClick={() => setSchemaEditOpen(true)} />}
            </Box>
            <BasicInfoSection entry={entry} onNavigate={onNavigate} schemaOnly />
          </Box>
        </Box>
        {/* 右: 権限ACL + Alias */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            px: 2,
            pt: 1.5,
            pb: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <AclSection
            contributor={entry.contributor}
            onEdit={isSystem ? undefined : () => setAclEditOpen(true)}
            onNavigate={onNavigate}
          />
          <Box>
            <Box
              display="flex"
              alignItems="center"
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: grey[50],
                border: `1px solid ${grey[200]}`,
                borderRadius: '4px 4px 0 0'
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color={grey[500]}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}
              >
                別名 (Alias)
              </Typography>
              {!isSystem && <EditLink onClick={() => setAliasEditOpen(true)} />}
            </Box>
            <BasicInfoSection entry={entry} onNavigate={onNavigate} aliasOnly hideTitle />
          </Box>
        </Box>
      </Box>

      <SchemaEditModal
        open={schemaEditOpen}
        onClose={() => setSchemaEditOpen(false)}
        entry={entry}
        onSuccess={() => onRefresh?.()}
      />
      <AclEditModal
        open={aclEditOpen}
        onClose={() => setAclEditOpen(false)}
        entry={entry}
        onSuccess={() => onRefresh?.()}
      />
      <AliasEditModal
        open={aliasEditOpen}
        onClose={() => setAliasEditOpen(false)}
        entry={entry}
        onSuccess={() => onRefresh?.()}
      />

      <AlertDialog
        title={`${key} を削除しますか？`}
        open={deleteDialog}
        onAgree={() => {
          setDeleteDialog(false)
          onDelete?.(key)
        }}
        handleClose={() => setDeleteDialog(false)}
      >
        削除後は復旧できません。配下のデータもすべて削除されます。
      </AlertDialog>
    </Box>
  )
}

// ─── 詳細アイコン用: 全て縦並びレイアウト ───

export const EntryPreviewPanel: React.FC<{
  entry: VtecxApp.Entry
  onClose: () => void
  onDelete?: (key: string) => void
  onRefresh?: () => void
  onNavigate?: (path: string) => void
}> = ({ entry, onClose, onDelete, onNavigate }) => {
  const [deleteDialog, setDeleteDialog] = React.useState(false)
  const key = entry.link?.[0]?.___href ?? entry.id?.split(',')[0] ?? ''

  return (
    <Box>
      <DetailHeader
        entry={entry}
        onClose={onClose}
        onDelete={onDelete ? () => setDeleteDialog(true) : undefined}
      />
      {/* 縦並びボディ */}
      <Box sx={{ px: 2, pt: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ flexShrink: 0 }}>
          <BasicInfoSection entry={entry} onNavigate={onNavigate} basicOnly />
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <AclSection contributor={entry.contributor} />
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <BasicInfoSection entry={entry} onNavigate={onNavigate} aliasOnly />
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <BasicInfoSection entry={entry} onNavigate={onNavigate} schemaOnly />
        </Box>
      </Box>

      <AlertDialog
        title={`${key} を削除しますか？`}
        open={deleteDialog}
        onAgree={() => {
          setDeleteDialog(false)
          onDelete?.(key)
        }}
        handleClose={() => setDeleteDialog(false)}
      >
        削除後は復旧できません。配下のデータもすべて削除されます。
      </AlertDialog>
    </Box>
  )
}
