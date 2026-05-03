const fs = require('node:fs')

const content = fs.readFileSync('src/pages-chat/detail/index.vue', 'utf-8')
const scriptMatch = content.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)
if (!scriptMatch) { console.log('NO SCRIPT FOUND'); process.exit(1) }
const code = scriptMatch[1]
const lines = code.split('\n')
console.log('Script lines:', lines.length)
console.log('Braces:', (code.match(/\{/g) || []).length, 'open, ', (code.match(/\}/g) || []).length, 'close')
try {
  new Function(code)
  console.log('SYNTAX OK')
}
catch (e) {
  console.log('SYNTAX ERROR:', e.message)
  const m = e.message.match(/line (\d+)/i)
  if (m) {
    const n = Number.parseInt(m[1])
    for (let i = Math.max(0, n - 3); i < Math.min(lines.length, n + 3); i++) {
      console.log(`${i + 1}: ${lines[i]}`)
    }
  }
}
