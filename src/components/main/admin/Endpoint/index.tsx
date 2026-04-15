import React from 'react'
import { Paper } from '@mui/material'
import MainContainer from '../../../parts/Container'
import { DataBrowser } from './components/browser/DataBrowser'

const Endpoint = () => {
  return (
    <MainContainer title="エンドポイント管理">
      <Paper
        variant="outlined"
        sx={{
          mt: 1,
          overflow: 'hidden',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <DataBrowser />
      </Paper>
    </MainContainer>
  )
}

export default Endpoint
