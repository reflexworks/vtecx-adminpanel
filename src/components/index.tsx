import '../styles/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import Loader from './parts/Loader'
import Main from './main/main'
import ServiceList from './main/main/ServiceList'
import Billing from './main/main/Billing'
import PaymentSuccess from './main/main/PaymentSuccess'
import PaymentFailure from './main/main/PaymentFailure'

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
          path: '/payment/success',
          Component: PaymentSuccess
        },
        {
          path: '/payment/failure',
          Component: PaymentFailure
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
