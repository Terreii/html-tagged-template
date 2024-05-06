exports.html = html
exports.save = save
exports.renderToString = renderToString
exports.render = render

const escape = require('escape-html')

const htmlSave = Symbol('save')

function * html (strings, ...values) {
  for (let i = 0, max = values.length; i < max; i++) {
    yield strings[i]

    const value = values[i]
    switch (typeof value) {
      case 'symbol':
        yield value.description
        break

      case 'string':
        yield escape(value)
        break

      case 'object':
        if (value && value[htmlSave] && 'value' in value) {
          yield String(value.value)
        } else {
          yield String(value)
        }
        break

      default:
        yield String(value)
    }
  }

  yield strings[strings.length - 1]
}

function save (string) {
  return { value: string, [htmlSave]: true }
}

function renderToString (iterator) {
  return Array.from(iterator).join('')
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
