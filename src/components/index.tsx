import '../styles/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import Main from './main'
import { createHashRouter, RouterProvider } from 'react-router'
import ServiceList from './main/ServiceList'
import Billing from './main/Billing'
import Loader from './parts/Loader'

function App() {
  const router = createHashRouter([
    {
      Component: Main,
      children: [
        {
          path: '/servicelist',
          Component: ServiceList
        },
        {
          path: '/billing',
          Component: Billing
        },
        {
          path: '*',
          Component: ServiceList
        }
      ]
    }
  ])
  return (
    <Loader>
      <RouterProvider router={router} />
    </Loader>
  )
}
createRoot(document.getElementById('content')!).render(<App />)
