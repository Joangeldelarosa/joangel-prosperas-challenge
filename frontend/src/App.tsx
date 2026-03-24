import { useState } from 'react'
import { motion } from 'framer-motion'
import Layout from './components/Layout'
import LoginForm from './components/LoginForm'
import JobForm from './components/JobForm'
import JobList from './components/JobList'
import SummaryCards from './components/SummaryCards'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorNotification from './components/ErrorNotification'
import { useAuth } from './hooks/useAuth'
import { useJobs } from './hooks/useJobs'
import { jobsApi } from './services/api'
import type { CreateJobRequest } from './types'

function Dashboard() {
  const { logout } = useAuth()
  const { jobs, total, page, hasNext, nextPage, prevPage, refresh, error: jobsError } = useJobs()
  const [submitLoading, setSubmitLoading] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const handleCreateJob = async (data: CreateJobRequest) => {
    setSubmitLoading(true)
    try {
      await jobsApi.create(data)
      setNotification({ message: '¡Reporte enviado a la cola exitosamente!', type: 'success' })
      refresh()
    } catch {
      setNotification({ message: 'Error al crear el reporte. Inténtalo de nuevo.', type: 'error' })
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <Layout username={localStorage.getItem('user_id')?.slice(0, 8) || 'User'} onLogout={logout}>
      <ErrorNotification
        message={notification?.message || jobsError}
        type={notification?.type || 'error'}
        onDismiss={() => setNotification(null)}
      />

      {/* Main Dashboard Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.05)] grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border border-outline-variant/10"
      >
        <JobForm onSubmit={handleCreateJob} loading={submitLoading} />
        <JobList
          jobs={jobs}
          total={total}
          page={page}
          hasNext={hasNext}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      </motion.div>

      <SummaryCards jobs={jobs} total={total} />
    </Layout>
  )
}

function App() {
  const auth = useAuth()

  if (!auth.isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginForm
          onLogin={auth.login}
          onRegister={auth.register}
          loading={auth.loading}
          error={auth.error}
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}

export default App
