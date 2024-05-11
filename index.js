exports.html = html
exports.save = save
exports.renderToString = renderToString
exports.render = render

const escape = require('escape-html')

const htmlSave = Symbol('save')

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
function * innerHtml (strings, values) {
  for (let i = 0, max = values.length; i < max; i++) {
    yield strings[i]

    const [isIterator, value] = handleValue(values[i])
    if (isIterator) {
      yield * value
    } else {
      yield value
    }
  }

  yield strings[strings.length - 1]
}

function * escapeIterator (iterator) {
  for (const rawValue of iterator) {
    const [isIterator, value] = handleValue(rawValue)
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
 * @returns {[true, Iterable<string>] | [false, string]}
 */
function handleValue (value) {
  switch (typeof value) {
    case 'symbol':
      return [false, value.description]

    case 'string':
      return [false, escape(value)]

    case 'object':
      if (value == null) return [false, String(value)]

      if (typeof value.next === 'function' || value[Symbol.iterator]) {
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
 * Mark a string as save HTML. It will then not escaped in the html function.
 * @param {string} string   HTML save string.
 * @returns Object that is marked as save HTML.
 */
function save (string) {
  return { value: string, [htmlSave]: true }
}

function renderToString (iterator) {
  let result = ''
  for (const value of iterator) {
    result += value.toString()
  }
  return result
}

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
