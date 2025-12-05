import { atom, useAtom } from 'jotai'
import React from 'react'

export const snackbarAtom = atom<boolean>(false)

export const snackbarMessageAtom = atom<string | undefined>()

const useSnackbar = () => {
  const [open, setOpen] = useAtom<boolean>(snackbarAtom)

  const [message, setMessage] = useAtom<string | undefined>(snackbarMessageAtom)

  const handleClose = React.useCallback(() => {
    setOpen(false)
  }, [])

  return {
    open,
    setOpen,
    handleClose,
    message,
    setMessage
  }
}

export default useSnackbar
