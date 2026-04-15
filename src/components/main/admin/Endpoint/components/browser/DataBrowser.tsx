import React from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Snackbar
} from '@mui/material'
import {
  Add,
  Refresh,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  InfoOutlined,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Search,
  Terminal
} from '@mui/icons-material'
import { grey, blue, teal, orange } from '@mui/material/colors'
import VtecxApp from '../../../../../../typings'
import { fetcher } from '../../../../../../utils/fetcher'
import dayjs from 'dayjs'
import {
  BrowserEntry,
  PAGE_SIZE,
  getBrowserParams,
  setBrowserParams,
  buildBreadcrumbs
} from '../../types'
import { AclChips } from '../acl/AclEditor'
import { EntryDetailPanel } from '../entry/EntryDetailPanel'
import { EntryPreviewPanel } from '../entry/EntryDetailPanel'
import { EntryFormModal } from '../modals/EntryFormModal'
import { SearchModal, SearchState } from '../modals/SearchModal'

export const DataBrowser: React.FC = () => {
  const initParams = getBrowserParams()

  const [breadcrumbs, setBreadcrumbs] = React.useState(() => buildBreadcrumbs(initParams.path))
  const [entries, setEntries] = React.useState<BrowserEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [isEmpty, setIsEmpty] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()
  const [currentDetail, setCurrentDetail] = React.useState<VtecxApp.Entry | undefined>()
  const [previewDetail, setPreviewDetail] = React.useState<VtecxApp.Entry | undefined>()
  const [message, setMessage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [searchModalOpen, setSearchModalOpen] = React.useState(false)
  const [navigatingKey, setNavigatingKey] = React.useState<string | null>(null)
  const [commandMenuAnchor, setCommandMenuAnchor] = React.useState<HTMLElement | null>(null)
  const [copySnackbar, setCopySnackbar] = React.useState(false)
  const lastSearchStateRef = React.useRef<SearchState | undefined>(undefined)
  const [page, setPage] = React.useState(initParams.page)
  const [totalCount, setTotalCount] = React.useState<number | undefined>()

  const currentPath = breadcrumbs[breadcrumbs.length - 1].path

  const loadChildren = React.useCallback(async (path: string, targetPage: number) => {
    setLoading(true)
    setError(undefined)
    setIsEmpty(false)
    setEntries([])
    try {
      const base = path === '/' ? `/d/` : `/d${path}`
      if (targetPage === 1) {
        try {
          const countRes = await fetcher(`${base}?f&c&l=*`, 'get')
          const cnt = parseInt(countRes?.data?.feed?.title ?? '0', 10)
          setTotalCount(isNaN(cnt) ? undefined : cnt)
          await fetcher(`${base}?f&l=${PAGE_SIZE}&_pagination=1,${PAGE_SIZE}`, 'get')
        } catch {
          /* カウント失敗は無視 */
        }
      }
      const res = await fetcher(`${base}?f&n=${targetPage}&l=${PAGE_SIZE}`, 'get')
      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        setIsEmpty(true)
      } else {
        const data: VtecxApp.Entry[] = Array.isArray(res.data) ? res.data : [res.data]
        const mapped: BrowserEntry[] = data
          .map(e => {
            const href = e.link?.[0]?.___href ?? ''
            const name = href.split('/').filter(Boolean).pop() ?? href
            return { entry: e, isFolder: true, key: href, name }
          })
          .sort((a, b) => {
            const aSystem = a.key.startsWith('/_')
            const bSystem = b.key.startsWith('/_')
            if (aSystem !== bSystem) return aSystem ? 1 : -1
            return a.name.localeCompare(b.name)
          })
        setEntries(mapped)
      }
    } catch (err: any) {
      if (err?.response?.status === 204) {
        setIsEmpty(true)
      } else {
        setError(
          `データの取得に失敗しました: ${err?.response?.data?.feed?.title ?? err?.message ?? '不明なエラー'}`
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const navigateTo = React.useCallback(
    async (path: string) => {
      let detail: VtecxApp.Entry | undefined
      if (path !== '/') {
        try {
          const res = await fetcher(`/d${path}?e`, 'get')
          detail = (Array.isArray(res.data) ? res.data[0] : res.data) ?? undefined
        } catch {}
      }
      setCurrentDetail(detail)
      setPage(1)
      setTotalCount(undefined)
      setPreviewDetail(undefined)
      setBreadcrumbs(buildBreadcrumbs(path))
      setBrowserParams(path, 1)
      loadChildren(path, 1)
    },
    [loadChildren]
  )

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setPreviewDetail(undefined)
    setBrowserParams(currentPath, newPage)
    loadChildren(currentPath, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  React.useEffect(() => {
    const { path, page: p } = getBrowserParams()
    setPage(p)
    setBreadcrumbs(buildBreadcrumbs(path))
    if (path !== '/') {
      fetcher(`/d${path}?e`, 'get')
        .then(res => setCurrentDetail(Array.isArray(res.data) ? res.data[0] : res.data))
        .catch(() => {})
    }
    loadChildren(path, p)
  }, [])

  React.useEffect(() => {
    const handlePop = () => {
      const { path, page: p } = getBrowserParams()
      setPage(p)
      setTotalCount(undefined)
      setPreviewDetail(undefined)
      setCurrentDetail(undefined)
      setBreadcrumbs(buildBreadcrumbs(path))
      if (path !== '/') {
        fetcher(`/d${path}?e`, 'get')
          .then(res => setCurrentDetail(Array.isArray(res.data) ? res.data[0] : res.data))
          .catch(() => {})
      }
      loadChildren(path, p)
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [loadChildren])

  const reloadCurrentDetail = React.useCallback(() => {
    if (!currentDetail) return
    const key =
      currentDetail.link?.find(l => l.___rel === 'self')?.___href ??
      currentDetail.id?.split(',')[0] ??
      ''
    if (!key) return
    fetcher(`/d${key}?e`, 'get')
      .then(res => setCurrentDetail(Array.isArray(res.data) ? res.data[0] : res.data))
      .catch(() => {})
  }, [currentDetail])

  const handleRowClick = (e: BrowserEntry) => {
    setNavigatingKey(e.key)
    navigateTo(e.key).finally(() => setNavigatingKey(null))
  }

  const handleViewDetail = async (e: BrowserEntry) => {
    let detail: VtecxApp.Entry = e.entry
    try {
      const res = await fetcher(`/d${e.key}?e`, 'get')
      detail = (Array.isArray(res.data) ? res.data[0] : res.data) ?? e.entry
    } catch {}
    setPreviewDetail(detail)
  }

  const navigateBreadcrumb = (idx: number) => {
    const crumbs = buildBreadcrumbs(currentPath)
    const target = crumbs[idx]
    if (!target) return
    navigateTo(target.path)
  }

  const handleDeleteEntry = async (key: string) => {
    try {
      await fetcher(`/d${key}?_rf`, 'delete')
      setMessage({ type: 'info', value: `${key} を削除しました。` })
      if (key === currentPath) {
        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
        navigateTo(parentPath)
      } else {
        loadChildren(currentPath, page)
      }
      setTimeout(() => setMessage(undefined), 5000)
    } catch {
      setMessage({ type: 'error', value: `${key} の削除に失敗しました。` })
    }
  }

  const totalPages = totalCount !== undefined ? Math.ceil(totalCount / PAGE_SIZE) : undefined

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          borderRight: previewDetail ? `1px solid ${grey[200]}` : 'none'
        }}
      >
        {/* パンくず + アクションバー */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: `1px solid ${grey[200]}`,
            bgcolor: grey[50],
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <Home fontSize="small" sx={{ color: grey[500], flexShrink: 0 }} />
          <Breadcrumbs
            separator={<ChevronRight fontSize="small" />}
            sx={{ flex: 1, '& .MuiBreadcrumbs-separator': { mx: 0.25 } }}
            data-testid="breadcrumb-nav"
          >
            {breadcrumbs.map((b, i) =>
              i < breadcrumbs.length - 1 ? (
                <Link
                  key={b.path}
                  component="button"
                  variant="caption"
                  underline="hover"
                  onClick={() => navigateBreadcrumb(i)}
                  sx={{ color: blue[600], cursor: 'pointer', fontFamily: 'monospace' }}
                  data-testid={i === 0 ? 'breadcrumb-root' : `breadcrumb-${b.label}`}
                >
                  {b.label}
                </Link>
              ) : (
                <Typography
                  key={b.path}
                  variant="caption"
                  sx={{ color: grey[700], fontFamily: 'monospace', fontWeight: 600 }}
                  data-testid={i === 0 ? 'breadcrumb-root' : `breadcrumb-${b.label}`}
                >
                  {b.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
          {/* アクションボタン群（右寄せ） */}
          <Box display="flex" alignItems="center" gap={0.25} flexShrink={0}>
            {currentPath === '/' && (
              <>
                <Tooltip title="追加">
                  <IconButton
                    size="small"
                    onClick={() => setAddModalOpen(true)}
                    data-testid="add-entry-button"
                  >
                    <Add fontSize="small" sx={{ color: teal[600] }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="リロード">
                  <IconButton
                    size="small"
                    onClick={() => loadChildren(currentPath, page)}
                    data-testid="reload-button"
                  >
                    <Refresh fontSize="small" sx={{ color: grey[600] }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="検索">
              <IconButton
                size="small"
                onClick={() => setSearchModalOpen(true)}
                data-testid="search-button"
              >
                <Search fontSize="small" sx={{ color: grey[600] }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="コマンド">
              <IconButton size="small" onClick={e => setCommandMenuAnchor(e.currentTarget)}>
                <Terminal fontSize="small" sx={{ color: grey[600] }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={commandMenuAnchor}
              open={Boolean(commandMenuAnchor)}
              onClose={() => setCommandMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {[
                { label: 'download', value: 'npx vtecxutil download:folderacls' },
                { label: 'upload', value: 'npx vtecxutil upload:folderacls' }
              ].map(item => (
                <MenuItem
                  key={item.label}
                  dense
                  onClick={() => {
                    navigator.clipboard.writeText(item.value)
                    setCopySnackbar(true)
                    setCommandMenuAnchor(null)
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: grey[700] }}>
                      {item.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: grey[500] }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
            <Snackbar
              open={copySnackbar}
              autoHideDuration={2000}
              onClose={() => setCopySnackbar(false)}
              message="コピーしました"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
          </Box>
        </Box>

        {/* メッセージ */}
        {message && (
          <Alert
            severity={message.type}
            onClose={() => setMessage(undefined)}
            sx={{ mx: 1.5, mt: 1 }}
            data-testid="browser-message"
          >
            {message.value}
          </Alert>
        )}

        {/* 現在の階層エントリ詳細 */}
        {currentDetail && (
          <Box sx={{ borderBottom: `1px solid ${grey[200]}` }}>
            <EntryDetailPanel
              entry={currentDetail}
              onClose={() => {
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
                navigateTo(parentPath)
              }}
              onDelete={handleDeleteEntry}
              onRefresh={reloadCurrentDetail}
              onNavigate={navigateTo}
            />
          </Box>
        )}

        {/* 子エントリ一覧 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={28} data-testid="browser-loading" />
            </Box>
          )}
          {error && !loading && (
            <Box sx={{ m: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Alert severity="error" sx={{ flex: 1 }} data-testid="browser-error">
                {error}
              </Alert>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={() => loadChildren(currentPath, page)}
                data-testid="browser-reload-button"
              >
                リロード
              </Button>
            </Box>
          )}
          {isEmpty && !loading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                gap: 1.5
              }}
              data-testid="browser-empty"
            >
              <FolderOpen sx={{ fontSize: 40, color: grey[300] }} />
              <Typography variant="body2" color={grey[500]} data-testid="browser-empty-message">
                これより先にデータはありません
              </Typography>
              <Typography variant="caption" color={grey[400]}>
                {currentPath}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => setAddModalOpen(true)}
                data-testid="add-entry-button"
              >
                データを追加
              </Button>
            </Box>
          )}
          {!loading && !error && entries.length > 0 && (
            <>
              <TableContainer data-testid="entry-table">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: grey[50] }}>
                        <Typography variant="caption" fontWeight={600}>
                          名前
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ bgcolor: grey[50], display: { xs: 'none', md: 'table-cell' } }}
                      >
                        <Typography variant="caption" fontWeight={600}>
                          権限
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ bgcolor: grey[50], display: { xs: 'none', md: 'table-cell' } }}
                      >
                        <Typography variant="caption" fontWeight={600}>
                          更新日時
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ bgcolor: grey[50], width: 40 }} align="right">
                        {currentPath !== '/' && (
                          <Box display="flex" justifyContent="flex-end" gap={0.5}>
                            <Tooltip title="追加">
                              <IconButton
                                size="small"
                                onClick={() => setAddModalOpen(true)}
                                data-testid="add-entry-button"
                              >
                                <Add fontSize="small" sx={{ color: teal[600] }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="リロード">
                              <IconButton
                                size="small"
                                onClick={() => loadChildren(currentPath, page)}
                                data-testid="reload-button"
                              >
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map(e => {
                      const isSystem = e.key.startsWith('/_')
                      const isPreviewing =
                        previewDetail?.link?.[0]?.___href === e.key ||
                        previewDetail?.id?.startsWith(e.key + ',')
                      const isNavigating = navigatingKey === e.key
                      const entryName = e.name
                      return (
                        <TableRow
                          key={e.key}
                          hover
                          sx={{
                            bgcolor: isNavigating
                              ? blue[50]
                              : isPreviewing
                                ? teal[50]
                                : isSystem
                                  ? grey[50]
                                  : undefined,
                            cursor: isNavigating ? 'progress' : 'pointer',
                            '&:hover': {
                              bgcolor: isNavigating ? blue[50] : isPreviewing ? teal[100] : blue[50]
                            }
                          }}
                          onClick={() => {
                            if (!isNavigating) handleRowClick(e)
                          }}
                          data-testid={`entry-row-${entryName}`}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {isNavigating ? (
                                <CircularProgress
                                  size={18}
                                  sx={{ flexShrink: 0, color: blue[400] }}
                                />
                              ) : (
                                <Folder
                                  sx={{
                                    fontSize: 18,
                                    color: isSystem ? grey[400] : orange[400],
                                    flexShrink: 0
                                  }}
                                />
                              )}
                              <Box minWidth={0}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: e.entry.title ? undefined : 'monospace',
                                    fontWeight: 500,
                                    color: isSystem ? grey[600] : grey[900]
                                  }}
                                  noWrap
                                  data-testid={`entry-name-${entryName}`}
                                >
                                  {e.entry.title ?? e.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: grey[400],
                                    fontFamily: 'monospace',
                                    fontSize: '0.65rem'
                                  }}
                                  noWrap
                                >
                                  {e.key}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <AclChips contributors={e.entry.contributor} />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" color={grey[500]}>
                              {e.entry.updated
                                ? dayjs(e.entry.updated).format('YYYY/MM/DD HH:mm')
                                : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" onClick={ev => ev.stopPropagation()}>
                            <Tooltip title="詳細を見る">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetail(e)}
                                sx={{ color: isPreviewing ? teal[600] : blue[400] }}
                                data-testid={`detail-button-${entryName}`}
                              >
                                <InfoOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ページング */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderTop: `1px solid ${grey[100]}`
                }}
              >
                {totalCount !== undefined && (
                  <Typography variant="caption" color={grey[500]}>
                    全 {totalCount.toLocaleString()} 件
                  </Typography>
                )}
                <Typography variant="caption" color={grey[500]}>
                  {PAGE_SIZE * (page - 1) + 1}–
                  {Math.min(PAGE_SIZE * page, totalCount ?? PAGE_SIZE * page)} 件
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  data-testid="pagination-prev"
                >
                  <KeyboardArrowLeft fontSize="small" />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ minWidth: 24, textAlign: 'center' }}
                  data-testid="pagination-current"
                >
                  {page}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={
                    totalPages !== undefined ? page >= totalPages : entries.length < PAGE_SIZE
                  }
                  data-testid="pagination-next"
                >
                  <KeyboardArrowRight fontSize="small" />
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* 右: プレビューペイン */}
      {previewDetail && (
        <Box sx={{ flex: '0 0 40%', minWidth: 320 }}>
          <EntryPreviewPanel
            entry={previewDetail}
            onClose={() => setPreviewDetail(undefined)}
            onDelete={handleDeleteEntry}
            onRefresh={() => loadChildren(currentPath, page)}
            onNavigate={path => {
              setPreviewDetail(undefined)
              navigateTo(path)
            }}
          />
        </Box>
      )}
      <EntryFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        parentPath={currentPath}
        onSuccess={() => loadChildren(currentPath, page)}
      />
      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={navigateTo}
        initialState={lastSearchStateRef.current}
        onStateChange={state => {
          lastSearchStateRef.current = state
        }}
      />
    </Box>
  )
}
