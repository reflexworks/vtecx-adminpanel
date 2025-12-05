import React from 'react'
import MainContainer from '../../parts/Container'
import { Refresh } from '@mui/icons-material'
import {
  Tooltip,
  IconButton,
  Box,
  Alert,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography
} from '@mui/material'
import CopyCommandMenu from '../../parts/CopyCommandMenu'
import useSchema, { schemaProps } from '../../../hooks/useSchema'
import { grey } from '@mui/material/colors'

const Schema = () => {
  const { list: schemas, get: getSchema } = useSchema()
  const [messeage] = React.useState<{ type: 'info' | 'error'; value: string } | undefined>()

  return (
    <MainContainer
      title={'エントリスキーマ管理'}
      action={
        <>
          <Tooltip title="Reload data" placement="top" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={getSchema}>
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <CopyCommandMenu
            menu={[
              { label: 'download', value: 'npm run download:template' },
              { label: 'upload', value: 'npm run upload:template' },
              { label: 'types', value: 'npm run download:typings' }
            ]}
          />
        </>
      }
    >
      <Box paddingBottom={2}>
        <Alert severity={'info'}>
          下記の内容を変更する場合は、
          <Typography
            color={grey[700]}
            sx={{ background: grey[100], borderRadius: 2, padding: 1 }}
            component={'span'}
            variant="body2"
          >
            setup/_settings/template.xml
          </Typography>
          を編集してください。
        </Alert>
      </Box>
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <TableContainer component={Paper} hidden={schemas && schemas.length <= 0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left">項目名</TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                和名
              </TableCell>
              <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                型
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                バリデーション
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                ACL権限
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                option
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schemas &&
              schemas.map((schema: schemaProps, index: number) => {
                const name = schema.name.trim().replace('\t', '')
                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const regex = new RegExp(escapedName + '$')

                const result = schema.path.replace('\t', '').replace(regex, '')

                return (
                  <TableRow hover key={schema.key + index}>
                    <TableCell
                      align="left"
                      sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                    >
                      <Typography variant="caption" color={grey[500]}>
                        {result}
                      </Typography>
                      <Typography variant="caption">{name}</Typography>
                    </TableCell>
                    <TableCell
                      align="left"
                      sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                    >
                      <Typography variant="caption" color={grey[600]}>
                        {schema.title}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="caption" component={'div'} gutterBottom>
                        {schema.type}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {schema.validation}
                    </TableCell>
                    <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {schema.acl}
                    </TableCell>
                    <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {schema.option}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </TableContainer>
    </MainContainer>
  )
}
export default Schema
