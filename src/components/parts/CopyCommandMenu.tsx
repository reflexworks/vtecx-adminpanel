import React from 'react'
import {
  Button,
  IconButton,
  InputAdornment,
  ListSubheader,
  Menu,
  OutlinedInput
} from '@mui/material'
import { ContentCopy, Download, KeyboardArrowDown } from '@mui/icons-material'
import useSnackbar from '../../hooks/useSnackbar'

const CopyCommandMenu = ({ menu }: { menu: { label: string; value: string }[] }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const { setOpen, setMessage } = useSnackbar()

  const handleCopy = (value: string) => {
    if (value)
      navigator.clipboard
        .writeText(value)
        .then(() => {
          setMessage('コピーしました。')
          setOpen(true)
        })
        .catch(err => {
          setMessage('コピーに失敗しました。')
          setOpen(true)
          console.error('コピーに失敗しました:', err)
        })
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={handleMenu}
        color={'success'}
        sx={{ display: { xs: 'inherit', md: 'none' } }}
        endIcon={<KeyboardArrowDown />}
      >
        <Download />
      </Button>
      <Button
        variant="contained"
        onClick={handleMenu}
        startIcon={<Download />}
        endIcon={<KeyboardArrowDown />}
        color={'success'}
        sx={{ display: { xs: 'none', md: 'inherit' } }}
      >
        コマンド
      </Button>

      <Menu
        id="copy-menu"
        anchorEl={anchorEl}
        keepMounted
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {menu.map((data: { label: string; value: string }, index: number) => {
          return (
            <ListSubheader key={data.label + index}>
              <OutlinedInput
                size="small"
                value={data.value}
                readOnly
                sx={{ width: '250px', marginRight: 2 }}
                startAdornment={<InputAdornment position="start">{data.label}</InputAdornment>}
              />
              <IconButton
                onClick={() => {
                  handleCopy(data.value)
                }}
                size="small"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </ListSubheader>
          )
        })}
      </Menu>
    </>
  )
}

export default CopyCommandMenu
