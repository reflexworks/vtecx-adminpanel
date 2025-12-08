import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Container, Stack, styled } from '@mui/material'

export default function MainContainer({
  title,
  children,
  action
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const PageContentHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(2)
  }))

  const PageHeaderToolbar = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    marginLeft: 'auto'
  }))
  return (
    <Container sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
      <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
        <Stack>
          <PageContentHeader>
            <Typography variant="h5">{title}</Typography>
            <PageHeaderToolbar>
              <Stack direction="row" alignItems="right" spacing={1}>
                {action}
              </Stack>
            </PageHeaderToolbar>
          </PageContentHeader>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Stack>
    </Container>
  )
}
