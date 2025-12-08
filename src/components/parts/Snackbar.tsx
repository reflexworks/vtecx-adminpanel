import * as React from 'react'
import Snackbar from '@mui/material/Snackbar'
import useSnackbar from '../../hooks/useSnackbar'

export default function AlertSnackbar() {
  const { open, handleClose, message } = useSnackbar()
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      open={open}
      onClose={handleClose}
      message={message}
      autoHideDuration={1000}
    />
  )
}
