import * as assert from 'node:assert'
import { test } from 'node:test'
import { parse } from 'node:path'
import standard from 'standard'

import { html, renderToString, render } from './index.js'

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

test('basic use', async t => {
  await t.test('should return an iterator', () => {
    const result = html`<h1>Hello World!</h1>`

    assert.strictEqual(typeof result.next, 'function')
    assert.deepStrictEqual(result.next(), { value: '<h1>Hello World!</h1>', done: false })
    assert.deepStrictEqual(result.next(), { value: undefined, done: true })
  })

  await t.test('should return the end string part', () => {
    const iterator = html`<h1>${'Hello!'}</h1>`
    const result = renderToString(iterator)

    assert.strictEqual(result, '<h1>Hello!</h1>')
  })

  await t.test('should be usable in a Response with render', async () => {
    const iterator = html`<h1>${42}</h1>`
    const res = new Response(render(iterator))
    const result = await res.text()
    assert.strictEqual(result, '<h1>42</h1>')
  })

  await t.test('should toString all primitive values', () => {
    const iterator = html`${null} ${undefined} ${true} ${false} ${0} ${1n} ${'some string'} ${Symbol('test')}`
    const result = renderToString(iterator)

    assert.strictEqual(result, 'null undefined true false 0 1 some string test')
  })
})
