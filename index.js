exports.html = html
exports.save = save
exports.renderToString = renderToString
exports.render = render

const escape = require('escape-html')

const htmlSave = Symbol('save')

/**
 * A HTML save tagged template string function.
 *
 * Useage:
 * ```javascript
 * const result = html`<p>${content}</p>
 * ```
 *
 * Renders a [Tagged template string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).
 *
 * Use this function as a streaming, server rendered, build and eval free template engine.
 *
 * Every value is stringified. While strings are HTML-escaped.
 * Unless they are marked as `save`.
 *
 * Iterators and Arrays are iterated.
 *
 * Nesting of html results is supported.
 *
 * Example:
 * ```javascript
 * import { html, save, render } from 'html-tagged-template'
 *
 * function post({ id, title, contentHtml }) {
 *   return html`
 *     ${header(title)}
 *     <main id="${id}">
 *       <h1>${title}</h1>
 *
 *       <div>
 *         ${save(contentHtml)}
 *       </div>
 *     </main>
 *
 *     ${comments(id)}
 *     ${footer()}
 *   `
 * }
 *
 * // A nested "Component".
 * async function comments(postId) {
 *   const comments = await db.comments.getAll({ postId })
 *   return html`
 *     <section>
 *       <h2>Comments</h2>
 *       ${comments.map(comment => html`
 *         <div id="${comment.id}">
 *           <span>${comment.name}</span>
 *           <span>${comment.plainText}</span>
 *         </div>
 *       `)}
 *     </section>
 *   `
 * }
 *
 * export default async function RenderPost(req) {
 *   const postData = await db.posts.get(req.id)
 *   const result = post(postData)
 *
 *   // Render into a Response object. This will stream the page.
 *   return new Response(render(result), {
 *     headers: {
 *       "Content-Type": "text/html; charset=utf-8"
 *     }
 *   })
 * }
 * ```
 * @param {TemplateStringsArray} strings   Template strings.
 * @param  {...any} values                 Values intermixed in the template string.
 * @returns {AsyncIterable<string>}
 */
function html (strings, ...values) {
  const iterator = innerHtml(strings, values)
  iterator[htmlSave] = true
  return iterator
}

/**
 * Yield the strings and stringify and html escape the values.
 * @param {string[]} strings  Strings of the template literal.
 * @param {any[]} values      Values embetted in the template literal.
 */
async function * innerHtml (strings, values) {
  for (let i = 0, max = values.length; i < max; i++) {
    yield strings[i]

    const [isIterator, value] = await handleValue(values[i])
    if (isIterator) {
      yield * value
    } else {
      yield value
    }
  }

  yield strings[strings.length - 1]
}

async function * escapeIterator (iterator) {
  for await (const rawValue of iterator) {
    const [isIterator, value] = await handleValue(rawValue)
    if (isIterator) {
      yield * value
    } else {
      yield value
    }
  }
}

/**
 * Checks the type of a value and stringifys it.
 * @param {any} value    Value to be handled.
 * @returns {Promise<[true, Iterable<string>] | [false, string]>}
 */
async function handleValue (value) {
  value = await Promise.resolve(value)

  switch (typeof value) {
    case 'symbol':
      return [false, value.description]

    case 'string':
      return [false, escape(value)]

    case 'object':
      if (value == null) return [false, String(value)]

      if (typeof value.next === 'function' || value[Symbol.iterator] || value[Symbol.asyncIterator]) {
        const result = value[htmlSave] ? value : escapeIterator(value)
        return [true, result]
      } else if (value[htmlSave] && 'value' in value) {
        return [false, String(value.value)]
      } else {
        return [false, String(value)]
      }

    default:
      return [false, String(value)]
  }
}

/**
 * Mark a string as save HTML. It will then not get escaped in the `html` function.
 * @param {string} string   HTML save string.
 * @returns Object that is marked as save HTML.
 */
function save (string) {
  return { value: string, [htmlSave]: true }
}

/**
 * Renders results of `html` into a string.
 *
 * Example:
 * ```javascript
 * const iterator = html`<p>Count: ${count}</p>`
 * const htmlString = await renderToString(iterator)
 * ```
 * @param {Iterable<string>|AsyncIterable<string>} iterator  Iterator (or result of `html`)
 * that should get rendered into a string.
 * @returns {Promise<string>}
 */
async function renderToString (iterator) {
  let result = ''
  for await (const value of iterator) {
    result += value.toString()
  }
  return result
}

/**
 * Renders the result of `html` into a format usable for
 * [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response).
 *
 * Example:
 * ```javascript
 * const result = html`<p>Count: ${count}</p>`
 * const res = new Response(render(result), {
 *   headers: {
 *     "Content-Type": "text/html; charset=utf-8"
 *   }
 * })
 * ```
 *
 * @param {Iterable<string>|AsyncIterable<string>} iterator Iterator (or result of `html`)
 * that should get rendered into a Response.
 * @returns {ReadableStream<Uint8Array>}
 */
function render (iterator) {
  return new ReadableStream({
    async pull (controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    }
  }).pipeThrough(new TextEncoderStream())
}
