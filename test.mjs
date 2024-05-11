import * as assert from 'node:assert'
import { test } from 'node:test'
import { parse } from 'node:path'
import standard from 'standard'

import { html, save, renderToString, render } from './index.js'

await test('standard formating', async t => {
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

await test('basic use', async t => {
  await t.test('should return an async iterator', async () => {
    const result = html`<h1>Hello World!</h1>`

    assert.strictEqual(typeof result.next, 'function')
    const returnValue = result.next()
    assert.strictEqual(typeof returnValue.then, 'function', 'should be a promise')
    assert.deepStrictEqual(
      await returnValue,
      { value: '<h1>Hello World!</h1>', done: false },
      'Promise should resolve an iterator result'
    )
    assert.deepStrictEqual(await result.next(), { value: undefined, done: true })
  })

  await t.test('should return the end string part', async () => {
    const iterator = html`<h1>${'Hello!'}</h1>`
    const result = await renderToString(iterator)

    assert.strictEqual(result, '<h1>Hello!</h1>')
  })

  await t.test('should be usable in a Response with render', async () => {
    const iterator = html`<h1>${42}</h1>`
    const res = new Response(render(iterator))
    const result = await res.text()
    assert.strictEqual(result, '<h1>42</h1>')
  })

  await t.test('should toString all primitive values', async () => {
    const iterator = html`${null} ${undefined} ${true} ${false} ${0} ${1n} ${'some string'} ${Symbol('test')}`
    const result = await renderToString(iterator)

    assert.strictEqual(result, 'null undefined true false 0 1 some string test')
  })
})

await test('nesting', async t => {
  await t.test('results of the html function can be used as argument', async () => {
    const innerIterator = html`<p>${'Text content'}</p>`
    const iterator = html`<main><h1>${'Some Title'}</h1>${innerIterator}</main>`
    const result = await renderToString(iterator)

    assert.strictEqual(result, '<main><h1>Some Title</h1><p>Text content</p></main>')
  })

  await t.test('iterators can be used as values', async () => {
    const iterator = (function * () {
      yield 'a '
      yield save('<br> ')
      yield '<script> '
      yield 5
    })()
    const result = await renderToString(html`<p>${iterator}</p>`)

    assert.strictEqual(result, '<p>a <br> &lt;script&gt; 5</p>')
  })

  await t.test('should handle async iterators', async () => {
    const iterator = (async function * () {
      yield 'a '
      yield save('<br> ')
      yield await Promise.resolve('<script> ')
      yield 5
    })()
    const result = await renderToString(html`<p>${iterator}</p>`)

    assert.strictEqual(result, '<p>a <br> &lt;script&gt; 5</p>')
  })

  await t.test('arrays can be used as values', async () => {
    const array = ['a ', save('<br> '), '<script> ', 5]
    const result = await renderToString(html`<p>${array}</p>`)

    assert.strictEqual(result, '<p>a <br> &lt;script&gt; 5</p>')
  })

  await t.test('results of the html function can be used inside of an array', async () => {
    const array = [
      { id: 1, text: 'Write Tests', done: false },
      { id: 2, text: 'learn template literals', done: true },
      { id: 3, text: 'Write blog post', done: false }
    ]
    const result = renderToString(html`<ul>${array.map(({ id, text, done }) => html`<li id="${id}">
      <input type="checkbox" name="checked_${id} ${done ? 'checked' : ''}>
      <span>${text}</span>
    </li>`)}</ul>`)

    assert.strictEqual(await result, `<ul><li id="1">
      <input type="checkbox" name="checked_1 >
      <span>Write Tests</span>
    </li><li id="2">
      <input type="checkbox" name="checked_2 checked>
      <span>learn template literals</span>
    </li><li id="3">
      <input type="checkbox" name="checked_3 >
      <span>Write blog post</span>
    </li></ul>`)
  })
})

await test('html save', async t => {
  await t.test('strings should get escaped', async () => {
    const iterator = html`${'<unsave>&'}`
    const result = await renderToString(iterator)

    assert.strictEqual(result, '&lt;unsave&gt;&amp;')
  })

  await t.test('save function should mark strings as save', async () => {
    const iterator = html`${save('<unsave>&')} ${save('')}`
    const result = await renderToString(iterator)

    assert.strictEqual(result, '<unsave>& ')
  })
})
