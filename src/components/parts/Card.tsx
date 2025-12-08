import * as React from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { CardActions } from '@mui/material'

export default function OutlinedCard({
  title,
  children,
  action
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Box sx={{ minWidth: 275 }}>
      <Card variant="outlined">
        <React.Fragment>
          <CardContent>
            <Typography variant="h6" component="div" marginBottom={2}>
              {title}
            </Typography>
            {children}
          </CardContent>
        </React.Fragment>
        {action && <CardActions>{action}</CardActions>}
      </Card>
    </Box>
  )
}
