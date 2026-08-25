const fs = require('fs')
const path = require('path')
const assert = require('assert')
const test = require('node:test')

const repoRoot = path.resolve(__dirname, '..')
const workflowsDir = path.join(repoRoot, '.github', 'workflows')
const immutableFullSha = /^[0-9a-f]{40}$/
const requiredUploadArtifactSha = '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'

const collectYamlFiles = (dir) => {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) return collectYamlFiles(absolutePath)
      return /\.ya?ml$/i.test(entry.name) ? [absolutePath] : []
    })
    .sort()
}

test('all external workflow actions are pinned to immutable full-length SHAs', () => {
  const violations = []

  for (const filePath of collectYamlFiles(workflowsDir)) {
    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/')
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

    lines.forEach((line, index) => {
      const match = line.match(/^\s*(?:-\s+)?uses:\s*([^\s#]+)(?:\s*(?:#.*)?)?$/)
      if (!match) return

      const usesTarget = match[1]
      if (usesTarget.startsWith('./') || usesTarget.startsWith('docker://')) return

      const atIndex = usesTarget.lastIndexOf('@')
      if (atIndex <= 0 || atIndex === usesTarget.length - 1) {
        violations.push(`${relativePath}:${index + 1} missing immutable ref: ${line.trim()}`)
        return
      }

      const ref = usesTarget.slice(atIndex + 1).trim()
      if (!immutableFullSha.test(ref)) {
        violations.push(
          `${relativePath}:${index + 1} expected 40-char lowercase SHA, got "${ref}"`,
        )
      }

      if (usesTarget.startsWith('actions/upload-artifact@') && ref !== requiredUploadArtifactSha) {
        violations.push(
          `${relativePath}:${index + 1} actions/upload-artifact must be pinned to ${requiredUploadArtifactSha}`,
        )
      }
    })
  }

  assert.deepEqual(
    violations,
    [],
    violations.length
      ? `Found non-immutable GitHub Action pins:\n${violations.join('\n')}`
      : undefined,
  )
})
