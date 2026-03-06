import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

export default function AlertDialog({
  title,
  open,
  onAgree,
  handleClose,
  children,
  color,
  'data-testid': dataTestId = 'delete-confirm-dialog',
  cancelTestId = 'delete-confirm-cancel',
  okTestId = 'delete-confirm-ok'
}: {
  title: string
  open: boolean
  onAgree: () => void
  handleClose: () => void
  children: React.ReactNode
  color?: 'error'
  'data-testid'?: string
  cancelTestId?: string
  okTestId?: string
}) {
  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        data-testid={dataTestId}
      >
        <DialogTitle id="alert-dialog-title" color={color}>
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">{children}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} data-testid={cancelTestId}>
            キャンセル
          </Button>
          <Button onClick={onAgree} autoFocus data-testid={okTestId}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  )
}
