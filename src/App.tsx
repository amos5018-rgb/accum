import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import HomePage from './pages/HomePage'
import ClassPage from './pages/ClassPage'
import StudentPage from './pages/StudentPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/class/:classId" element={<ClassPage />} />
          <Route path="/class/:classId/student/:studentId" element={<StudentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
