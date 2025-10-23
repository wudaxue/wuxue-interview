import './App.css'
import { Route, Routes } from 'react-router-dom'
import Download from '@/pages/download'
import Fetch from './pages/fetch'
import Home from './pages/home'

function App() {
  return (
    <div className='relative min-h-screen'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/fetch' element={<Fetch />} />
        <Route path='/download' element={<Download />} />
      </Routes>
    </div>
  )
}

export default App
