import React from 'react'
import { Box, Typography, IconButton, useTheme } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import useSnackbar from '../../hooks/useSnackbar'

const CopyableDisplay = ({ value }: { value?: string }) => {
  const theme = useTheme()

  const { setOpen, setMessage } = useSnackbar()

  const handleCopy = () => {
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
    <Box
      sx={{
        border: '1px solid #ccc',
        borderRadius: theme.shape.borderRadius * 0.2,
        padding: theme.spacing(1.5, 2),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}
    >
      <Typography
        variant="body1"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: theme.spacing(1),
          fontFamily: 'monospace, "Roboto Mono", sans-serif'
        }}
      >
        {value}
      </Typography>

      <IconButton onClick={handleCopy} size="small" sx={{ display: value ? undefined : 'none' }}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}

export default CopyableDisplay
