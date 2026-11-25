import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { myVisits } from '../../lib/chemistApi'
import ChemistLogin from './ChemistLogin'
import ChemistVisits from './ChemistVisits'
import ChemistTrip from './ChemistTrip'
import { IconLogout } from './ChemistIcons'
import './chemist.css'

const NOT_CHEMIST = 'الحساب ده مش حساب كيميائي'
const TRIP_ENDED = 'الرحلة دي اتلغت أو خلصت'

// /chemist: login -> visits list -> trip screen (one screen at a time, no sub-routes).
export default function ChemistApp() {
  const { session, loading, role, signOut } = useAdminAuth()
  const [notice, setNotice] = useState('')
  // True while a sign-in from this page is being checked, so a non-chemist
  // account never flashes past the login form before it is signed out.
  const [checking, setChecking] = useState(false)

  const isChemist = !!session && role === 'chemist'

  let content
  if (loading) {
    content = (
      <p className="chemist__loading" role="status">
        جاري التحميل...
      </p>
    )
  } else if (!session || (checking && !isChemist)) {
    content = (
      <ChemistLogin
        notice={notice}
        onSubmitStart={() => {
          setChecking(true)
          setNotice('')
        }}
        onSubmitDone={async ({ error, role: signedInRole }) => {
          if (!error && signedInRole !== 'chemist') {
            setNotice(NOT_CHEMIST)
            await signOut()
          }
          setChecking(false)
        }}
      />
    )
  } else if (!isChemist) {
    // A staff session opened from elsewhere: tell them, don't sign out silently.
    content = (
      <div className="chemist__body">
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <span>{NOT_CHEMIST}</span>
        </p>
        <button type="button" className="chemist__btn chemist__btn--secondary" onClick={signOut}>
          تسجيل خروج
        </button>
      </div>
    )
  } else {
    content = <ChemistHome key={session.user.id} signOut={signOut} />
  }

  return (
    <div className="chemist" dir="rtl">
      {content}
    </div>
  )
}

function ChemistHome({ signOut }) {
  const [visits, setVisits] = useState(null)
  const [error, setError] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [tripId, setTripId] = useState(null)
  const [notice, setNotice] = useState('')
  const resumeChecked = useRef(false)
  // The trip a pending check is about; cleared when the chemist ends it here,
  // so a late check result can't show the "cancelled" notice by mistake.
  const activeTrip = useRef(null)
  useEffect(() => {
    activeTrip.current = tripId
  }, [tripId])

  // Callbacks only (never called synchronously from an effect).
  const fetchVisits = useCallback(
    () =>
      myVisits().then(
        (rows) => {
          setVisits(rows)
          setLoadingList(false)
          // Resume: a trip already on the way (reload, phone restart) reopens.
          if (!resumeChecked.current) {
            resumeChecked.current = true
            const active = rows.find((v) => v.trip_status === 'on_way')
            if (active) setTripId(active.id)
          }
          return rows
        },
        (e) => {
          setError(e.message)
          setLoadingList(false)
          return null
        },
      ),
    [],
  )

  const load = useCallback(() => {
    setLoadingList(true)
    setError('')
    return fetchVisits()
  }, [fetchVisits])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  // Re-check the open trip (after a failed ping, and every 60 s). If staff
  // cancelled it or it is no longer on the way, leave the trip screen; that
  // unmounts ChemistTrip, which stops the location source.
  const checkTrip = useCallback((id) => {
    myVisits().then(
      (rows) => {
        if (activeTrip.current !== id) return
        setVisits(rows)
        const v = rows.find((r) => r.id === id)
        if (!v || v.trip_status !== 'on_way') {
          setTripId(null)
          setNotice(TRIP_ENDED)
        }
      },
      () => {}, // offline: stay on the trip screen; its warning already shows
    )
  }, [])

  // The trip screen only renders for a visit that is really on the way.
  const found = tripId ? visits?.find((v) => v.id === tripId) : null
  const tripVisit = found?.trip_status === 'on_way' ? found : null

  const header = (
    <header className="chemist__header">
      <h1 className="chemist__title">{tripVisit ? 'الرحلة' : 'زياراتي'}</h1>
      <button type="button" className="chemist__icon-btn" onClick={signOut}>
        <IconLogout size={20} />
        <span>خروج</span>
      </button>
    </header>
  )

  if (tripVisit) {
    return (
      <>
        {header}
        <ChemistTrip
          key={tripVisit.id}
          visit={tripVisit}
          onCheck={checkTrip}
          onDone={() => {
            activeTrip.current = null
            setTripId(null)
            load()
          }}
        />
      </>
    )
  }

  return (
    <>
      {header}
      <ChemistVisits
        visits={visits}
        loading={loadingList}
        error={error}
        notice={notice}
        onReload={load}
        onOpenTrip={(id) => {
          setNotice('')
          setTripId(id)
        }}
        onStarted={async (id) => {
          setNotice('')
          const rows = await load()
          if (rows?.some((v) => v.id === id && v.trip_status === 'on_way')) setTripId(id)
        }}
      />
    </>
  )
}
