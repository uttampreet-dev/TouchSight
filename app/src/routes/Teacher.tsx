import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Understand } from './teacher/Understand'
import { Workbench } from './teacher/Workbench'
import { Library } from './teacher/Library'
import { ClassView } from './teacher/ClassView'
import './teacher/teacher.css'

export function Teacher() {
  return (
    <main className="tc">
      <header className="tc-head">
        <Link to="/" style={{ textDecoration: 'none' }}><Brand /></Link>
        <span className="kicker">Teacher console</span>
        <nav className="tc-nav mono">
          <NavLink to="/teacher" end>new</NavLink>
          <NavLink to="/teacher/library">library</NavLink>
          <NavLink to="/teacher/class">class</NavLink>
          <NavLink to="/teacher/inspect">inspect</NavLink>
        </nav>
      </header>
      <Routes>
        <Route index element={<Workbench />} />
        <Route path="d/:id" element={<Workbench />} />
        <Route path="library" element={<Library />} />
        <Route path="class" element={<ClassView />} />
        <Route path="inspect" element={<Understand />} />
        <Route path="understand" element={<Understand />} />
      </Routes>
    </main>
  )
}
