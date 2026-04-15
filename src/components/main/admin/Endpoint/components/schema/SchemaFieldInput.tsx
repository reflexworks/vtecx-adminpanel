import React from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel
} from '@mui/material'
import { Close } from '@mui/icons-material'
import { grey } from '@mui/material/colors'
import { CustomField, validateSchemaValue } from '../../types'

export const SchemaFieldInput: React.FC<{
  cf: CustomField
  onChange: (value: string, error: string | undefined) => void
  onRemove: () => void
}> = ({ cf, onChange, onRemove }) => {
  const isBoolean = cf.type === 'boolean'
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
      <Box sx={{ minWidth: 120, flexShrink: 0, pt: isBoolean ? 0.5 : 1 }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: grey[600] }}>
          {cf.fieldKey}
        </Typography>
        {cf.type && (
          <Typography
            variant="caption"
            display="block"
            sx={{ color: grey[400], fontSize: '0.6rem' }}
          >
            {cf.type}
          </Typography>
        )}
      </Box>
      {isBoolean ? (
        <Box sx={{ flex: 1 }}>
          <RadioGroup row value={cf.value} onChange={e => onChange(e.target.value, undefined)}>
            <FormControlLabel
              value="true"
              control={<Radio size="small" />}
              label={<Typography variant="caption">true</Typography>}
            />
            <FormControlLabel
              value="false"
              control={<Radio size="small" />}
              label={<Typography variant="caption">false</Typography>}
            />
          </RadioGroup>
        </Box>
      ) : (
        <TextField
          size="small"
          fullWidth
          value={cf.value}
          type={cf.type === 'date' ? 'datetime-local' : 'text'}
          multiline={cf.fieldKey === 'content' || cf.fieldKey === 'rights' ? true : undefined}
          rows={cf.fieldKey === 'content' ? 3 : cf.fieldKey === 'rights' ? 2 : undefined}
          placeholder={
            cf.type === 'int' || cf.type === 'long'
              ? '整数を入力'
              : cf.type === 'float' || cf.type === 'double'
                ? '数値を入力'
                : undefined
          }
          error={Boolean(cf.error)}
          helperText={cf.error}
          onChange={e => {
            const val = e.target.value
            onChange(val, validateSchemaValue(val, cf.type))
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      <IconButton size="small" onClick={onRemove} sx={{ color: grey[400], flexShrink: 0, mt: 0.5 }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  )
}
