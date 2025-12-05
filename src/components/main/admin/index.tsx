import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Divider,
  CssBaseline,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle
} from '@mui/material'
import React from 'react'
import {
  AccountCircle,
  MenuOutlined,
  SettingsOutlined,
  ApiOutlined,
  DescriptionOutlined,
  HistoryOutlined,
  PeopleOutlined,
  SchemaOutlined,
  TuneOutlined
} from '@mui/icons-material'
import Footer from '../../parts/Footer'
import { matchPath, Outlet, useLocation } from 'react-router'
import useAccount from '../../../hooks/useAccount'
import useGeneralError from '../../../hooks/useGeneralError'
import AlertSnackbar from '../../parts/Snackbar'

const Admin = () => {
  const { error: general_error } = useGeneralError()

  const { account, account_email, logout } = useAccount()

  const { pathname } = useLocation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [isClosing, setIsClosing] = React.useState(false)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const container = window !== undefined ? () => window.document.body : undefined
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleDrawerClose = () => {
    setIsClosing(true)
    setMobileOpen(false)
  }

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false)
  }

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen)
    }
  }
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="body2" component="div" sx={{ flexGrow: 1 }}>
          <img src="../img/logo.svg" width="80px" style={{ marginRight: '10px' }} />
          管理画面
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={!!matchPath('/basic', pathname) || pathname === '/'}
            href="admin.html#/basic"
          >
            <ListItemIcon>
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText primary={'基本情報'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton href="admin.html#/log" selected={!!matchPath('/log', pathname)}>
            <ListItemIcon>
              <DescriptionOutlined />
            </ListItemIcon>
            <ListItemText primary={'ログ'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton href="admin.html#/endpoint" selected={!!matchPath('/endpoint', pathname)}>
            <ListItemIcon>
              <ApiOutlined />
            </ListItemIcon>
            <ListItemText primary={'エンドポイント管理'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton href="admin.html#/schema" selected={!!matchPath('/schema', pathname)}>
            <ListItemIcon>
              <SchemaOutlined />
            </ListItemIcon>
            <ListItemText primary={'スキーマ管理'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton href="admin.html#/users" selected={!!matchPath('/users', pathname)}>
            <ListItemIcon>
              <PeopleOutlined />
            </ListItemIcon>
            <ListItemText primary={'ユーザ管理'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            href="admin.html#/login_history"
            selected={!!matchPath('/login_history', pathname)}
          >
            <ListItemIcon>
              <HistoryOutlined />
            </ListItemIcon>
            <ListItemText primary={'ログイン履歴'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            href="admin.html#/properties"
            selected={!!matchPath('/properties', pathname)}
          >
            <ListItemIcon>
              <TuneOutlined />
            </ListItemIcon>
            <ListItemText primary={'詳細設定'} />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  )
  const drawerWidth = 240

  return (
    <React.Fragment>
      <CssBaseline />
      <AlertSnackbar />
      <AppBar color="inherit" position="static" component={'div'}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleDrawerToggle}
          >
            <MenuOutlined />
          </IconButton>
          <Typography
            variant="body2"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'block', sm: 'none' } }}
          >
            <img src="../img/logo.svg" width="80px" style={{ marginRight: '5px' }} />
            管理画面
          </Typography>
          <Typography
            variant="body2"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          ></Typography>
          <Typography variant="body2" sx={{ display: { xs: 'none', md: 'inline' } }}>
            {account_email}
          </Typography>

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <img
              src="../img/logo_vt.svg"
              width={'80%'}
              style={{ marginLeft: '15px', marginTop: '10px', marginBottom: '10px' }}
            />
            <Divider />
            <MenuItem sx={{ display: { md: 'none' } }}>
              <Typography variant="body2">{account?.title}</Typography>
            </MenuItem>
            <Divider sx={{ display: { md: 'none' } }} />
            <MenuItem onClick={logout}>
              <Typography variant="body2">ログアウト</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex' }}>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          <Drawer
            container={container}
            variant="temporary"
            open={mobileOpen}
            onTransitionEnd={handleDrawerTransitionEnd}
            onClose={handleDrawerClose}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
            }}
            slotProps={{
              root: {
                keepMounted: true
              }
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{ flexGrow: 1, width: { sm: `calc(100% - ${drawerWidth}px)`, xs: '100%' } }}
        >
          <Alert severity="error" sx={{ display: general_error ? 'block' : 'none' }}>
            <AlertTitle>エラーが発生しました。</AlertTitle>
            {general_error?.response.data.feed.title}
          </Alert>
          <Outlet />
          <Footer />
        </Box>
      </Box>
    </React.Fragment>
  )
}
export default Admin
