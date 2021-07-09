import fs from 'fs'
import path from 'path'

const outFile = 'autodiff.d.ts'
const buildDirectory = path.resolve(
  __dirname,
  '../build',
)
const typeFiles = fs
  .readdirSync(buildDirectory, { withFileTypes: true })
  .filter((dirEnt) => dirEnt.isFile())
  .filter(({ name }) => name.endsWith('.d.ts'))
  .filter(({ name }) => name !== outFile)

let combined = ''
typeFiles.forEach(({ name }) => {
  const types = fs.readFileSync(path.resolve(buildDirectory, name), 'utf8')

  // Remove imports for now
  combined += types
    .replace(/^import.*$/mg, '')
    .replace(/import\(".\/[^"]+"\)\./g, '')
    .replace(/declare module '[^']+' \{\n([^}]+)\}/mg, '$1')
})
fs.writeFileSync(path.resolve(buildDirectory, outFile), combined)
