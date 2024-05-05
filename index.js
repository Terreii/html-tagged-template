exports.html = html
exports.renderToString = renderToString
exports.render = render

function * html (strings, ...values) {
  for (let i = 0, max = values.length; i < max; i++) {
    yield strings[i]

    const value = values[i]
    switch (typeof value) {
      case 'symbol':
        yield value.description
        break

      default:
        yield String(value)
    }
  }

  yield strings[strings.length - 1]
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
