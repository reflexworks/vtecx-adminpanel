import '../styles/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import Loader from './parts/Loader'
import Admin from './main/admin'
import Basic from './main/admin/Basic'
import Endpoint from './main/admin/Endpoint'
import Properties from './main/admin/Properties'
import Users from './main/admin/Users'
import LoginHistory from './main/admin/LoginHistory'
import Schema from './main/admin/Schema'
import Log from './main/admin/Log'

function App() {
  const rxid = window.location.search.replace('?_RXID=', '')

  const [show_admin] = React.useState<boolean>(!Boolean(rxid))
  React.useEffect(() => {
    if (rxid) {
      window.location.replace(window.location.pathname)
    }
  },[rxid])

  const router = createHashRouter([
    {
      Component: Admin,
      children: [
        {
          path: '/basic',
          Component: Basic
        },
        {
          path: '/log',
          Component: Log
        },
        {
          path: '/endpoint',
          Component: Endpoint
        },
        {
          path: '/schema',
          Component: Schema
        },
        {
          path: '/properties',
          Component: Properties
        },
        {
          path: '/users',
          Component: Users
        },
        {
          path: '/login_history',
          Component: LoginHistory
        },
        {
          path: '*',
          Component: Basic
        }
      ]
    }
  ])
  return show_admin ? (
    <Loader>
      <RouterProvider router={router} />
    </Loader>
  ) : <></>
}
createRoot(document.getElementById('content')!).render(<App />)
