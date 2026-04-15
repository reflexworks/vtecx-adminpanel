import React from 'react'
import { Box, Typography, Paper, Chip, Link } from '@mui/material'
import { InsertDriveFile, ChevronRight } from '@mui/icons-material'
import { grey, blue, teal } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import dayjs from 'dayjs'
import { sortSchemaGroups } from '../../types'
import { AclUserLabel } from '../acl/AclEditor'

// ─── フィールド行（ラベル左・値右の整列）───────────────────────
export const FieldRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '80px 1fr',
      columnGap: 1.5,
      mb: 0.75,
      alignItems: 'flex-start'
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: grey[400], fontWeight: 600, pt: 0.1, wordBreak: 'keep-all' }}
    >
      {label}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        color: grey[800],
        fontFamily: mono ? 'monospace' : undefined,
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap'
      }}
    >
      {value}
    </Typography>
  </Box>
)

export const BasicInfoSection: React.FC<{
  entry: VtecxApp.Entry
  onNavigate?: (path: string) => void
  basicOnly?: boolean
  schemaOnly?: boolean
  aliasOnly?: boolean
  hideTitle?: boolean
}> = ({ entry, onNavigate, basicOnly, schemaOnly, aliasOnly, hideTitle }) => {
  const key = entry.link?.[0]?.___href ?? entry.id?.split(',')[0] ?? ''
  const standardFields = new Set([
    'id',
    'title',
    'subtitle',
    'rights',
    'summary',
    'content',
    'link',
    'contributor',
    'published',
    'updated',
    'author'
  ])
  const customEntries = Object.entries(entry).filter(([k]) => !standardFields.has(k))

  const selfHref = entry.link?.find(l => l.___rel === 'self')?.___href ?? ''
  const idKey = entry.id?.split(',')[0] ?? ''
  const showIdKey = idKey && selfHref && idKey !== selfHref
  const filteredAliases = (entry.link?.filter(l => l.___rel === 'alternate') ?? []).filter(
    l => l.___href !== selfHref
  )
  const showAliasSection = filteredAliases.length > 0 || showIdKey

  const customGroupsRaw: Record<string, [string, any][]> = {}
  customEntries.forEach(([k, v]) => {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      customGroupsRaw[k] = Object.entries(v)
    } else {
      if (!customGroupsRaw['__root__']) customGroupsRaw['__root__'] = []
      customGroupsRaw['__root__'].push([k, v])
    }
  })
  const customGroups: Record<string, [string, any][]> = Object.fromEntries(
    sortSchemaGroups(Object.entries(customGroupsRaw))
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* ── 基本情報 ── */}
      {!schemaOnly && !aliasOnly && (
        <Box>
          <Typography
            variant="caption"
            fontWeight={700}
            color={grey[500]}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}
          >
            基本情報
          </Typography>
          {[
            { label: 'ID', value: entry.id, mono: true },
            { label: 'キー', value: key, mono: true }
          ]
            .filter(f => f.value)
            .map(f => (
              <FieldRow key={f.label} label={f.label} value={f.value} mono={f.mono} />
            ))}
          {(() => {
            const authors: { uri?: string }[] = (entry as any).author ?? []
            const created = authors.find(a => a.uri?.match(/^urn:vte\.cx:created:/))
            const updated = authors.find(a => a.uri?.match(/^urn:vte\.cx:updated:/))
            const createdUid = created?.uri?.match(/^urn:vte\.cx:created:(\d+)$/)?.[1]
            const updatedUid = updated?.uri?.match(/^urn:vte\.cx:updated:(\d+)$/)?.[1]
            const authorLink = (uid: string) => {
              if (uid === '0')
                return (
                  <Typography variant="caption" sx={{ color: grey[400] }}>
                    サービスによる作成
                  </Typography>
                )
              return <AclUserLabel uid={uid} onNavigate={onNavigate} />
            }
            return (
              <>
                {createdUid && <FieldRow label="作成者" value={authorLink(createdUid)} />}
                {entry.published && (
                  <FieldRow
                    label="作成日時"
                    value={dayjs(entry.published).format('YYYY/MM/DD HH:mm:ss')}
                  />
                )}
                {updatedUid && <FieldRow label="更新者" value={authorLink(updatedUid)} />}
                {entry.updated && entry.updated !== entry.published && (
                  <FieldRow
                    label="更新日時"
                    value={dayjs(entry.updated).format('YYYY/MM/DD HH:mm:ss')}
                  />
                )}
              </>
            )
          })()}
        </Box>
      )}

      {/* ── Alias ── */}
      {!schemaOnly && !basicOnly && (
        <Box sx={{ border: `1px solid ${grey[200]}`, borderRadius: 1, overflow: 'hidden' }}>
          {!hideTitle && (
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
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                別名 (Alias)
              </Typography>
              {filteredAliases.length > 0 && (
                <Chip
                  label={filteredAliases.length}
                  size="small"
                  sx={{ height: 16, fontSize: '0.6rem', bgcolor: teal[100], color: teal[900] }}
                />
              )}
            </Box>
          )}
          <Box sx={{ px: 1.5, py: 1 }}>
            {!showAliasSection ? (
              <Typography variant="caption" color={grey[400]}>
                設定なし
              </Typography>
            ) : (
              <>
                {showIdKey && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.75,
                      p: 0.75,
                      borderRadius: 1,
                      bgcolor: teal[50],
                      border: `1px solid ${teal[100]}`
                    }}
                  >
                    <InsertDriveFile fontSize="small" sx={{ color: teal[500], flexShrink: 0 }} />
                    <Box flex={1} minWidth={0}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color={teal[800]}
                        display="block"
                        sx={{ fontSize: '0.65rem' }}
                      >
                        実体キー (ID)
                      </Typography>
                      {onNavigate ? (
                        <Link
                          component="button"
                          variant="caption"
                          underline="hover"
                          onClick={() => onNavigate(idKey)}
                          sx={{
                            fontFamily: 'monospace',
                            color: teal[700],
                            wordBreak: 'break-all',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}
                        >
                          {idKey}
                        </Link>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            color: teal[700],
                            wordBreak: 'break-all',
                            fontSize: '0.65rem'
                          }}
                        >
                          {idKey}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                {filteredAliases.map((l, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <ChevronRight fontSize="small" sx={{ color: teal[400], flexShrink: 0 }} />
                    {onNavigate && l.___href ? (
                      <Link
                        component="button"
                        variant="caption"
                        underline="hover"
                        onClick={() => onNavigate(l.___href!)}
                        sx={{
                          fontFamily: 'monospace',
                          color: teal[700],
                          wordBreak: 'break-all',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        {l.___href}
                      </Link>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', color: teal[700], wordBreak: 'break-all' }}
                      >
                        {l.___href}
                      </Typography>
                    )}
                  </Box>
                ))}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* ── スキーマ ── */}
      {!basicOnly &&
        !aliasOnly &&
        (() => {
          const hasCommon =
            entry.title || entry.subtitle || entry.rights || entry.content?.______text
          const rootFields = customGroups['__root__'] ?? []
          const nonRootGroups = Object.entries(customGroups).filter(([k]) => k !== '__root__')
          if (!hasCommon && rootFields.length === 0 && nonRootGroups.length === 0) return null
          return (
            <>
              {(hasCommon || rootFields.length > 0) && (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color={grey[500]}
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'block',
                      mb: 1
                    }}
                  >
                    (ルート)
                  </Typography>
                  {entry.title && <FieldRow label="title" value={entry.title} />}
                  {entry.subtitle && <FieldRow label="subtitle" value={entry.subtitle} />}
                  {entry.rights && <FieldRow label="rights" value={entry.rights} />}
                  {entry.content?.______text && (
                    <FieldRow label="content" value={entry.content.______text} />
                  )}
                  {[...rootFields]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => (
                      <FieldRow
                        key={k}
                        label={k}
                        value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                      />
                    ))}
                </Paper>
              )}
              {nonRootGroups.map(([parentKey, fields]) => (
                <Paper key={parentKey} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color={blue[700]}
                    sx={{ fontFamily: 'monospace', display: 'block', mb: 0.75 }}
                  >
                    {parentKey}
                  </Typography>
                  {[...fields]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => (
                      <FieldRow
                        key={k}
                        label={k}
                        value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                      />
                    ))}
                </Paper>
              ))}
            </>
          )
        })()}
    </Box>
  )
}
