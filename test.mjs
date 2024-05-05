import * as assert from 'node:assert'
import { test } from 'node:test'
import { parse } from 'node:path'
import standard from 'standard'

import { html } from './index.js'

test('standard formating', async t => {
  const results = await standard.lintFiles(['index.js', 'test.mjs'], { fix: true })

  for (const result of results) {
    const name = parse(result.filePath).base

    for (const error of result.messages) {
      const severity = error.severity === 1 ? ' (warning)' : ''
      console.log(`${name}:${error.line || 0}:${error.column || 0}: ${error.message} (${error.ruleId})${severity}`)
    }
    assert.strictEqual(result.errorCount, 0, `${name} should have no error count`)
    assert.strictEqual(result.fatalErrorCount, 0, `${name} should have no fatal error count`)
    assert.strictEqual(result.warningCount, 0, `${name} should have no warning count`)
  }
})

test('exports', t => {
  assert.strictEqual(typeof html, 'function', 'should export the html function')
})
