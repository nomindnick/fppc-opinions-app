import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SearchPage from './pages/SearchPage'
import OpinionPage from './pages/OpinionPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SearchPage />} />
        <Route path="/opinion/:id" element={<OpinionPage />} />
      </Route>
    </Routes>
  )
}

export default App
