import { useEffect, useRef, useState } from 'react'
import splashVideo from '../assets/splash.mp4'
import './Splash.css'

// The source clip fades in from black for its first ~0.5s — with object-fit:contain
// that shows up as a hard-edged black box on the splash background, so we skip past it.
const SKIP_INTRO_SEC = 0.6
const MAX_DURATION_MS = 3200
const FADE_MS = 350

export default function Splash({ onFinish }) {
  const videoRef = useRef(null)
  const [fading, setFading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let fadeTimer
    let finishTimer

    const finish = () => {
      setFading(true)
      fadeTimer = setTimeout(onFinish, FADE_MS)
    }

    // Fallback in case autoplay is blocked or the video fails to load
    finishTimer = setTimeout(finish, MAX_DURATION_MS)

    const video = videoRef.current
    const handleEnded = () => {
      clearTimeout(finishTimer)
      finish()
    }
    const handleLoadedMetadata = () => {
      if (video.duration > SKIP_INTRO_SEC) {
        video.currentTime = SKIP_INTRO_SEC
      } else {
        setReady(true)
        video.play().catch(() => {})
      }
    }
    const handleSeeked = () => {
      setReady(true)
      video.play().catch(() => {})
    }

    video?.addEventListener('ended', handleEnded)
    video?.addEventListener('loadedmetadata', handleLoadedMetadata)
    video?.addEventListener('seeked', handleSeeked, { once: true })

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
      video?.removeEventListener('ended', handleEnded)
      video?.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video?.removeEventListener('seeked', handleSeeked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`splash ${fading ? 'splash--fade' : ''}`} role="presentation">
      <video
        ref={videoRef}
        className={`splash__video ${ready ? 'splash__video--ready' : ''}`}
        src={splashVideo}
        muted
        playsInline
        preload="auto"
      />
    </div>
  )
}
