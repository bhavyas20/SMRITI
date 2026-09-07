import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider } from '@/auth/AuthProvider.tsx'
import { queryClient } from '@/lib/queryClient.ts'
import { router } from '@/routes/router.tsx'
import './index.css'

/**
 * Provider order matters: `AuthProvider` clears the query cache on sign-out, so
 * it has to sit inside `QueryClientProvider` to reach the client.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
