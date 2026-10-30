import { useEffect } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Understand } from './teacher/Understand'
import { Workbench } from './teacher/Workbench'
import { Library } from './teacher/Library'
import { ClassRoom } from './teacher/ClassRoom'
import { startTeacherClass, useTeacherClass } from '../class/teacher'
import { ClassView } from './teacher/ClassView'
import './teacher/teacher.css'

export function Teacher() {
  const cls = useTeacherClass()
  useEffect(() => { startTeacherClass() }, [])
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
          <NavLink to="/teacher/class">class</NavLink>
        </nav>
        <Link to="/teacher/class" className={`tc-class ${cls.link}`} title="classroom code · phones joined">
          <i /><b>{cls.code.split('').join(' ')}</b><span>{cls.phones} {cls.phones === 1 ? 'phone' : 'phones'}</span>
        </Link>
      </header>
      <Routes>
        <Route index element={<Workbench />} />
        <Route path="d/:id" element={<Workbench />} />
        <Route path="library" element={<Library />} />
        <Route path="class" element={<ClassView />} />
        <Route path="inspect" element={<Understand />} />
        <Route path="understand" element={<Understand />} />
        <Route path="class" element={<ClassRoom />} />
      </Routes>
    </main>
  )
}
