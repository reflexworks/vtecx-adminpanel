import React from 'react'
import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress
} from '@mui/material'
import { Search } from '@mui/icons-material'
import { grey, blue } from '@mui/material/colors'
import { fetcher } from '../../../../../../utils/fetcher'
import { CustomField, COMMON_SCHEMA_FIELDS } from '../../types'

export const SchemaFieldSearch: React.FC<{
  onAdd: (fields: CustomField[]) => void
  existingParents: string[]
  existingFullKeys?: string[]
  showCommon?: boolean
  externalSchemaList?: { path: string; type: string; indent: number }[]
}> = ({
  onAdd,
  existingParents,
  existingFullKeys = [],
  showCommon = false,
  externalSchemaList
}) => {
  const [query, setQuery] = React.useState('')
  const [schemaList, setSchemaList] = React.useState<any[]>(externalSchemaList ?? [])
  const [results, setResults] = React.useState<any[]>([])
  const [loadingSchema, setLoadingSchema] = React.useState(false)
  const [dropOpen, setDropOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  React.useEffect(() => {
    if (externalSchemaList) {
      setSchemaList(externalSchemaList)
      return
    }
    setLoadingSchema(true)
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
          const type = typeMatch ? typeMatch[1] : ''
          while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
          const parentPath = stack.length > 0 ? stack[stack.length - 1].path : ''
          const fullPath = parentPath ? `${parentPath}.${name}` : name
          stack.push({ indent, path: fullPath })
          parsed.push({ path: fullPath, type, indent })
        })
        setSchemaList(parsed)
      })
      .catch(() => {})
      .finally(() => setLoadingSchema(false))
  }, [externalSchemaList])

  const getChildren = (parentPath: string) =>
    schemaList.filter(
      s => s.path.startsWith(parentPath + '.') && !s.path.slice(parentPath.length + 1).includes('.')
    )

  const getUnregisteredChildren = (parentPath: string) =>
    getChildren(parentPath).filter(c => !existingFullKeys.includes(c.path))

  const isAllRegistered = (parentPath: string) => {
    const children = getChildren(parentPath)
    return children.length > 0 && children.every(c => existingFullKeys.includes(c.path))
  }

  const handleSearch = (val: string) => {
    setQuery(val)
    setActiveIdx(-1)
    if (!val) {
      setResults(schemaList)
      return
    }
    const q = val.toLowerCase()
    setResults(schemaList.filter(s => s.path.toLowerCase().includes(q)).slice(0, 50))
  }

  const handleAdd = (item: { path: string; type: string }) => {
    const children = getChildren(item.path)
    if (children.length === 0) {
      if (existingFullKeys.includes(item.path)) return
      const dot = item.path.lastIndexOf('.')
      const parentKey = dot > 0 ? item.path.slice(0, dot) : ''
      const fieldKey = dot > 0 ? item.path.slice(dot + 1) : item.path
      onAdd([
        { parentKey, fieldKey, fullKey: item.path, type: item.type, label: item.path, value: '' }
      ])
    } else {
      const unregistered = getUnregisteredChildren(item.path)
      if (unregistered.length === 0) return
      onAdd(
        unregistered.map(c => ({
          parentKey: item.path,
          fieldKey: c.path.slice(item.path.length + 1),
          fullKey: c.path,
          type: c.type,
          label: c.path,
          value: ''
        }))
      )
    }
    setQuery('')
    setResults([])
    setActiveIdx(-1)
  }

  const handleFocus = () => {
    if (!query) setResults(schemaList)
  }

  const getDropdownStyle = () => {
    if (!containerRef.current) return {}
    const rect = containerRef.current.getBoundingClientRect()
    return { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }

  // 表示されている全候補をフラットに列挙（共通スキーマ + カスタムスキーマ）
  const flatItems = React.useMemo(() => {
    const common = showCommon
      ? COMMON_SCHEMA_FIELDS.filter(
          f => !query || f.path.toLowerCase().includes(query.toLowerCase())
        )
      : []
    return [...common, ...results]
  }, [showCommon, query, results])

  const scrollToItem = (idx: number) => {
    const item = listRef.current?.children[idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropOpen || flatItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => {
        const n = Math.min(prev + 1, flatItems.length - 1)
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
      if (activeIdx >= 0 && activeIdx < flatItems.length) {
        const item = flatItems[activeIdx] as any
        if ('label' in item && 'type' in item && !('indent' in item)) {
          // 共通スキーマ
          onAdd([
            {
              parentKey: '',
              fieldKey: item.path,
              fullKey: item.path,
              type: item.type,
              label: item.label,
              value: ''
            }
          ])
          setQuery('')
          setResults([])
          setActiveIdx(-1)
          setDropOpen(false)
        } else {
          handleAdd(item)
          setDropOpen(false)
        }
      }
    } else if (e.key === 'Escape') {
      setDropOpen(false)
    }
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <TextField
        size="small"
        fullWidth
        label="スキーマ項目を検索"
        placeholder="項目名を入力..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => {
          setDropOpen(true)
          handleFocus()
        }}
        onBlur={() =>
          setTimeout(() => {
            setDropOpen(false)
            setActiveIdx(-1)
          }, 150)
        }
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            endAdornment: loadingSchema ? (
              <CircularProgress size={14} />
            ) : (
              <Search fontSize="small" sx={{ color: grey[400] }} />
            )
          }
        }}
      />
      {dropOpen &&
        (results.length > 0 ||
          (showCommon &&
            COMMON_SCHEMA_FIELDS.some(
              f => !query || f.path.toLowerCase().includes(query.toLowerCase())
            ))) && (
          <Paper
            elevation={4}
            sx={{
              position: 'fixed',
              zIndex: 1400,
              maxHeight: 280,
              overflowY: 'auto',
              border: `1px solid ${grey[200]}`,
              ...getDropdownStyle()
            }}
          >
            <List ref={listRef} dense disablePadding>
              {showCommon &&
                (() => {
                  const filtered = COMMON_SCHEMA_FIELDS.filter(
                    f => !query || f.path.toLowerCase().includes(query.toLowerCase())
                  )
                  if (filtered.length === 0) return null
                  return (
                    <>
                      <ListItemButton disabled sx={{ bgcolor: grey[100], py: 0.5 }}>
                        <ListItemText
                          primary={
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color={grey[500]}
                              sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              共通スキーマ
                            </Typography>
                          }
                        />
                      </ListItemButton>
                      {filtered.map(f => {
                        const done = existingFullKeys.includes(f.path)
                        return (
                          <ListItemButton
                            key={f.path}
                            disabled={done}
                            onClick={() => {
                              onAdd([
                                {
                                  parentKey: '',
                                  fieldKey: f.path,
                                  fullKey: f.path,
                                  type: f.type,
                                  label: f.label,
                                  value: ''
                                }
                              ])
                              setQuery('')
                              setResults([])
                              setActiveIdx(-1)
                            }}
                            sx={{
                              bgcolor:
                                flatItems.indexOf(f as any) === activeIdx ? blue[50] : undefined
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {f.path}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ color: grey[400], ml: 1 }}
                                  >
                                    ({f.type})
                                  </Typography>
                                </Typography>
                              }
                              secondary={done ? '追加済み' : f.label}
                            />
                          </ListItemButton>
                        )
                      })}
                    </>
                  )
                })()}
              {results.length > 0 && (
                <>
                  {showCommon && (
                    <ListItemButton disabled sx={{ bgcolor: grey[100], py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color={grey[500]}
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            カスタムスキーマ
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  )}
                  {results.map(r => {
                    const children = getChildren(r.path)
                    const hasChildren = children.length > 0
                    const isChild = r.path.includes('.')
                    const allDone = hasChildren
                      ? isAllRegistered(r.path)
                      : existingFullKeys.includes(r.path)
                    const unregistered = hasChildren ? getUnregisteredChildren(r.path) : []
                    const partiallyAdded =
                      hasChildren && existingParents.includes(r.path) && !allDone
                    const depth = (r.path.match(/\./g) || []).length
                    return (
                      <ListItemButton
                        key={r.path}
                        disabled={allDone}
                        onClick={() => handleAdd(r)}
                        sx={{
                          pl: 2 + depth * 2,
                          bgcolor: flatItems.indexOf(r) === activeIdx ? blue[50] : undefined
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {isChild ? r.path.slice(r.path.lastIndexOf('.') + 1) : r.path}
                              {r.type ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ color: grey[400], ml: 1 }}
                                >
                                  ({r.type})
                                </Typography>
                              ) : null}
                            </Typography>
                          }
                          secondary={
                            allDone
                              ? '追加済み'
                              : hasChildren
                                ? partiallyAdded
                                  ? `未追加の子項目を追加 (${unregistered.length}件)`
                                  : '子項目をすべて追加'
                                : isChild
                                  ? undefined
                                  : '単独フィールドとして追加'
                          }
                        />
                      </ListItemButton>
                    )
                  })}
                </>
              )}
            </List>
          </Paper>
        )}
    </Box>
  )
}
