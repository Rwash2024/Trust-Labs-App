import { useState } from 'react'
import { MapPinIcon, CheckIcon } from './icons'
import { MAX_LINK_LENGTH, locationLinkError, mapsUrlFor } from '../lib/location'
import './LocationPicker.css'

// Optional pin for a home visit. The written address stays required (building,
// floor and flat never show up in a GPS fix); this only helps the chemist find
// the building. Two paths, because the person booking is often not at the
// visit address (booking for a parent elsewhere):
//   - "here":  the browser's one-shot GPS fix (needs HTTPS + the user's OK)
//   - "other": paste a location link someone sent them (WhatsApp / Google Maps)

const GEO_ERRORS = {
  1: 'رفضت إذن الموقع. تقدر تسمح بيه من إعدادات المتصفح، أو تكمّل بالعنوان المكتوب بس.',
  2: 'مقدرناش نحدد موقعك دلوقتي. اتأكد إن الـ GPS شغّال وجرّب تاني.',
  3: 'تحديد الموقع أخد وقت طويل. جرّب تاني وإنت قريب من شباك.',
}

export default function LocationPicker({ value, onChange }) {
  // value: { where: 'here' | 'other' | null, coords: {lat,lng,accuracy} | null, link: string }
  const [state, setState] = useState('idle') // idle | locating | error
  const [errorMsg, setErrorMsg] = useState('')
  const { where, coords, link } = value

  const setWhere = (next) => {
    setState('idle')
    setErrorMsg('')
    onChange({ where: next, coords: null, link: '' })
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setState('error')
      setErrorMsg('المتصفح ده مش بيدعم تحديد الموقع. تقدر تلزق لينك لوكيشن بدل كده.')
      return
    }
    setState('locating')
    setErrorMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState('idle')
        onChange({
          where,
          link: '',
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          },
        })
      },
      (err) => {
        setState('error')
        setErrorMsg(GEO_ERRORS[err.code] || GEO_ERRORS[2])
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const linkError = locationLinkError(link)

  return (
    <div className="locpick">
      <div className="locpick__head">
        <span className="locpick__icon"><MapPinIcon /></span>
        <div>
          <span className="locpick__title">حدّد مكان الزيارة على الخريطة <em>(اختياري)</em></span>
          <span className="locpick__sub">بيساعد الكيميائي يوصلك أسرع. العنوان المكتوب لسه مطلوب.</span>
        </div>
      </div>

      <span className="locpick__question">الزيارة في المكان اللي إنت فيه دلوقتي؟</span>
      <div className="booking__toggle booking__toggle--sm">
        <button type="button" className={`booking__toggle-btn${where === 'here' ? ' active' : ''}`} onClick={() => setWhere('here')}>
          أيوه، أنا هناك
        </button>
        <button type="button" className={`booking__toggle-btn${where === 'other' ? ' active' : ''}`} onClick={() => setWhere('other')}>
          لا، مكان تاني
        </button>
      </div>

      {where === 'here' && !coords && (
        <button type="button" className="locpick__locate" onClick={locate} disabled={state === 'locating'}>
          {state === 'locating' ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
        </button>
      )}

      {where === 'here' && coords && (
        <div className="locpick__done">
          <span className="locpick__done-icon"><CheckIcon /></span>
          <div className="locpick__done-text">
            <span>تم تحديد موقعك</span>
            <span className="locpick__accuracy">
              الدقة تقريبًا {coords.accuracy.toLocaleString('en-US')} متر
              {coords.accuracy > 100 && '، دي دقة ضعيفة، اكتب علامة مميزة في العنوان'}
            </span>
          </div>
          <a href={mapsUrlFor(coords.lat, coords.lng)} target="_blank" rel="noopener noreferrer">راجعه على الخريطة</a>
          <button type="button" className="locpick__reset" onClick={() => onChange({ where, coords: null, link: '' })}>
            إلغاء
          </button>
        </div>
      )}

      {where === 'other' && (
        <label className="booking__field locpick__link">
          <span>لينك اللوكيشن</span>
          <input
            type="url"
            dir="ltr"
            inputMode="url"
            value={link}
            maxLength={MAX_LINK_LENGTH}
            onChange={(e) => onChange({ where, coords: null, link: e.target.value })}
            placeholder="https://maps.app.goo.gl/..."
            aria-invalid={!!linkError}
          />
          {linkError ? (
            <span className="booking__field-error">{linkError}</span>
          ) : (
            <span className="locpick__hint">خلّي اللي في مكان الزيارة يبعتلك اللوكيشن على واتساب، وانسخ اللينك هنا.</span>
          )}
        </label>
      )}

      {state === 'error' && <p className="booking__field-error">{errorMsg}</p>}
    </div>
  )
}
