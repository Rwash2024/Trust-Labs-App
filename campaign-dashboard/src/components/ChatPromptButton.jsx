import { useState } from 'react'
import { copyText } from '../lib/clipboard.js'
import { buildChatPrompt } from '../lib/engine.js'

export default function ChatPromptButton({ idea, month, mix, competitors, insights, pkg }) {
  const [msg, setMsg] = useState('')

  async function onClick() {
    const r = await copyText(buildChatPrompt({ idea, month, mix, competitors, insights, pkg }))
    setMsg(r.ok ? 'اتنسخ! الصقه في ChatGPT أو Gemini أو Claude ✅' : 'مقدرتش أنسخ تلقائي، جرّب تاني.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <span className="chat-prompt">
      <button type="button" className="btn accent" onClick={onClick}>انسخ الأمر</button>
      {msg && <span className="muted" role="status"> {msg}</span>}
    </span>
  )
}
