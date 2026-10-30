import { createContext, useContext, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Lang } from '../tdm/types'
import { loadLang, storeLang } from '../i18n'
import { StudentLibrary } from './student/Library'
import { Explore } from './student/Explore'
import './student/student.css'

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} })
export const useLang = () => useContext(LangContext)

/** The student's phone: a library of diagrams to touch, hear and be quizzed on. Works from the home screen, offline. */
export function Student() {
  const [lang, setLangState] = useState<Lang>(loadLang)
  const setLang = (l: Lang) => { storeLang(l); setLangState(l) }
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Routes>
        <Route index element={<StudentLibrary />} />
        <Route path="d/:id" element={<Explore />} />
      </Routes>
    </LangContext.Provider>
  )
}
