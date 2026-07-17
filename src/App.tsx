import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <h1 className="text-4xl font-bold text-slate-800">Home</h1>
      <p className="mt-2 text-slate-500">
        React + Vite + TypeScript, styled with Tailwind and animated with Framer
        Motion.
      </p>
    </motion.div>
  )
}

function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <h1 className="text-4xl font-bold text-slate-800">About</h1>
      <p className="mt-2 text-slate-500">A second route via React Router.</p>
    </motion.div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center gap-8 p-10">
        <nav className="flex gap-6">
          <Link className="text-indigo-600 hover:underline" to="/">
            Home
          </Link>
          <Link className="text-indigo-600 hover:underline" to="/about">
            About
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
