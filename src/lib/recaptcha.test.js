import test from 'node:test'
import assert from 'node:assert/strict'
import { createRecaptcha } from './recaptcha.js'

// Minimal fake browser: injecting the script "loads" it on the next tick.
function fakeBrowser({ load = true, executeImpl } = {}) {
  const appended = []
  const win = {}
  const doc = {
    createElement: (tag) => ({ tag, attrs: {} }),
    head: {
      appendChild(el) {
        appended.push(el)
        if (el.tag === 'script' && load) {
          setTimeout(() => {
            win.grecaptcha = {
              ready: (cb) => cb(),
              execute: executeImpl ?? (async (key, opts) => `token-for-${key}-${opts.action}`),
            }
            el.onload?.()
          }, 0)
        }
      },
    },
  }
  return { win, doc, appended }
}

test('without a site key it is disabled, returns null and never touches the page', async () => {
  const { win, doc, appended } = fakeBrowser()
  const r = createRecaptcha({ siteKey: '', win, doc })
  assert.equal(r.enabled, false)
  assert.equal(await r.getToken('booking'), null)
  assert.equal(appended.length, 0)
})

test('with a site key it loads the script once and returns a token for the action', async () => {
  const { win, doc, appended } = fakeBrowser()
  const r = createRecaptcha({ siteKey: 'SITEKEY', win, doc })
  assert.equal(r.enabled, true)
  assert.equal(await r.getToken('booking'), 'token-for-SITEKEY-booking')
  assert.equal(await r.getToken('booking'), 'token-for-SITEKEY-booking')
  const scripts = appended.filter((e) => e.tag === 'script')
  assert.equal(scripts.length, 1)
  assert.match(scripts[0].src, /^https:\/\/www\.google\.com\/recaptcha\/api\.js\?render=SITEKEY$/)
})

test('the floating badge is hidden once (the legal notice is shown in the form instead)', async () => {
  const { win, doc, appended } = fakeBrowser()
  const r = createRecaptcha({ siteKey: 'K', win, doc })
  await r.getToken('booking')
  await r.getToken('booking')
  const styles = appended.filter((e) => e.tag === 'style')
  assert.equal(styles.length, 1)
  assert.match(styles[0].textContent, /grecaptcha-badge/)
})

test('if the script never loads (blocked) it gives up with null instead of hanging', async () => {
  const { win, doc } = fakeBrowser({ load: false })
  const r = createRecaptcha({ siteKey: 'K', win, doc, timeoutMs: 30 })
  const started = Date.now()
  assert.equal(await r.getToken('booking'), null)
  assert.ok(Date.now() - started < 500)
})

test('if executing the check throws, it returns null and never rejects', async () => {
  const { win, doc } = fakeBrowser({ executeImpl: async () => { throw new Error('boom') } })
  const r = createRecaptcha({ siteKey: 'K', win, doc })
  assert.equal(await r.getToken('booking'), null)
})

test('if executing the check is too slow it times out with null', async () => {
  const { win, doc } = fakeBrowser({ executeImpl: () => new Promise(() => {}) })
  const r = createRecaptcha({ siteKey: 'K', win, doc, timeoutMs: 30 })
  assert.equal(await r.getToken('booking'), null)
})
