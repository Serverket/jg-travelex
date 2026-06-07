#!/usr/bin/env node
// scripts/release.js
// Usage: bun run release 3.0.0 --note "message"

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
const version = args[0]
const noteIndex = args.indexOf('--note')
const note = noteIndex !== -1 ? args[noteIndex + 1] : ''
const force = args.includes('--force')

const rootDir = path.resolve(__dirname, '..')

// ---------- helpers ----------
function exit(msg) {
  console.error(msg)
  process.exit(1)
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

// ---------- validation ----------
if (!version) {
  exit('Usage: bun run release <version> --note "message"')
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  exit(`Invalid version "${version}". Must be semver (e.g. 3.0.0).`)
}

if (!note && !force) {
  exit('Missing --note. Provide a release note or use --force to skip.')
}

// Check dirty tree
let dirty = false

const isTreeDirty = () => {
  try {
    execSync('git diff --quiet --exit-code', { cwd: rootDir, stdio: 'ignore' })
    return false
  } catch {
    return true
  }
}

if (isTreeDirty() && !force) {
  exit('Working tree has uncommitted changes. Use --force to override.')
}

// Also check if we are in a git repo
const isRepo = () => {
  try {
    execSync('git rev-parse --git-dir', { cwd: rootDir, stdio: 'ignore' })
    return true
    } catch {
    return false
  }
}

if (!isRepo()) {
  exit('Not a git repository. Run this from the project root inside a git repo.')
}

// ---------- stash & reset (optional, to prevent conflicts) ----------
let stashed = false
if (isTreeDirty() && force) {
  execSync('git stash push --include-untracked -m "release-auto-stash"', { cwd: rootDir, stdio: 'inherit' })
  stashed = true
}

try {
  // ---------- bump versions ----------
  const versionFiles = [
    { path: 'package.json', type: 'json' },
    { path: 'backend/package.json', type: 'json' },
    { path: 'public/manifest.json', type: 'json' }
  ]

  versionFiles.forEach(({ path: filePath }) => {
    const fullPath = path.join(rootDir, filePath)
    const data = readJSON(fullPath)
    if (data.version) {
      data.version = version
      writeJSON(fullPath, data)
      console.log(`Bumped version in ${filePath} to ${version}`)
    }
  })

  // README.md badge
  const readmePath = path.join(rootDir, 'README.md')
  let readme = fs.readFileSync(readmePath, 'utf-8')
  readme = readme.replace(
    /version-[\d.]+-blue\.svg/g,
    `version-${version}-blue.svg`
  )
  fs.writeFileSync(readmePath, readme)
  console.log('Updated README.md version badge')

  // sw.js cache name
  const swPath = path.join(rootDir, 'public/sw.js')
  let swContent = fs.readFileSync(swPath, 'utf-8')
  swContent = swContent.replace(
    /const CACHE_NAME = 'trip-calculator-v[\d.]+';/, 
    `const CACHE_NAME = 'trip-calculator-v${version}';`
  )
  fs.writeFileSync(swPath, swContent)
  console.log('Updated sw.js cache name')

  // public/release-info.json
  const releaseInfo = {
    version,
    note: note || `Release ${version}`,
    date: new Date().toISOString()
  }
  writeJSON(path.join(rootDir, 'public', 'release-info.json'), releaseInfo)
  console.log('Wrote public/release-info.json')

  // ---------- build ----------
  execSync('bun run build', { cwd: rootDir, stdio: 'inherit' })

  // ---------- commit & tag ----------
  execSync('git add -A', { cwd: rootDir, stdio: 'ignore' })
  execSync(`git commit -m "release: v${version} - ${note || 'No note provided'}"`, { cwd: rootDir, stdio: 'inherit' })
  execSync(`git tag v${version}`, { cwd: rootDir, stdio: 'inherit' })

  console.log(`\n[OK] Release v${version} created and tagged.`)
  console.log('Next step: push the tag to your remote.')
  console.log(`  git push origin v${version}`)
} catch (err) {
  if (err.message) {
    console.error(`Error: ${err.message}`)
  } else {
    console.error(err)
  }
  if (stashed) {
    try {
      console.log('Restoring stashed changes...')
      execSync('git stash pop', { cwd: rootDir, stdio: 'inherit' })
    } catch (_e) {
      // ignore if stash already popped or no longer exists
    }
  }
  process.exit(1)
}

// Pop the saved stash if the script succeeds
if (stashed) {
  try {
    execSync('git stash pop', { cwd: rootDir, stdio: 'inherit' })
  } catch (_e) {
    // ignore if stash already popped or no longer exists
  }
}
