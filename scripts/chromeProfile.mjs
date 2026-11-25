// A throwaway Chrome profile for the headless QA scripts, removed when the script is done.
// The folder's name holds the script's pid: a killed script leaves its profile, and a later run removes it.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const NAME = /^shamayim-chrome-(\d+)-/

/** Nothing but the page: no component or extension downloads (they leave files in the temp folder too). */
export const QUIET = ['--no-first-run', '--no-default-browser-check', '--disable-component-update', '--disable-extensions',
  '--disable-background-networking', '--disable-sync']

function alive(pid) {
  try { process.kill(pid, 0); return true } catch (error) { return error.code !== 'ESRCH' }
}

/** Chrome's helper processes hold the files for a moment after it exits, so the removal retries. */
export function removeProfile(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 150 }) } catch { /* a later run removes it */ }
}

export function makeProfile(parent = os.tmpdir()) {
  for (const name of fs.readdirSync(parent)) {
    const pid = Number(NAME.exec(name)?.[1])
    if (pid && !alive(pid)) removeProfile(path.join(parent, name))
  }
  return fs.mkdtempSync(path.join(parent, `shamayim-chrome-${process.pid}-`))
}

/** Stops a spawned Chrome and waits until it has exited. */
export function stopChrome(browser) {
  if (browser.exitCode !== null || browser.signalCode !== null || browser.pid === undefined) return Promise.resolve()
  return new Promise((resolve) => { browser.once('exit', resolve); browser.kill() })
}
