import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 26 ships an experimental global localStorage that shadows jsdom's; use a simple in-memory one.
const mem = new Map()
const memStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)) },
  removeItem: (k) => { mem.delete(k) },
  clear: () => { mem.clear() },
}
Object.defineProperty(globalThis, 'localStorage', { value: memStorage, configurable: true, writable: true })

afterEach(() => { cleanup(); mem.clear() })
