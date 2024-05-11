# HTML-Tagged-Template Demo Project

This is a demo!

In this project I tested how easy it is, to build a template engine with no build step or usage of eval.

## Installation

Don't!

Use one of those:

- [common-tags](https://www.npmjs.com/package/common-tags)
- [html-template-tag](https://www.npmjs.com/package/html-template-tag)
- [escape-html-template-tag](https://www.npmjs.com/package/escape-html-template-tag)
- [Radically Straightforward · HTML](https://www.npmjs.com/package/@radically-straightforward/html)
- For the browser:
  - [lit-html](https://www.npmjs.com/package/lit-html) - The original
  - [htm](https://www.npmjs.com/package/htm)
  - [nanohtml](https://www.npmjs.com/package/nanohtml)

If you still want to try it:

```sh
npm i https://github.com/Terrii/html-tagged-template
```

## Usage

This package is intented to be used as a node.js server side rendering engine.

It uses [Tagged templates strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).

Example:

```javascript
import { html, save, render } from "html-tagged-template";

function post({ id, title, contentHtml }) {
  return html`
    ${header(title)}
    <main id="${id}">
      <h1>${title}</h1>

      <div>${save(contentHtml)}</div>
    </main>

    ${comments(id)} ${footer()}
  `;
}

// A nested "Component".
async function comments(postId) {
  const comments = await db.comments.getAll({ postId });
  return html`
    <section>
      <h2>Comments</h2>
      ${comments.map(
        (comment) => html`
          <div id="${comment.id}">
            <span>${comment.name}</span>
            <span>${comment.plainText}</span>
          </div>
        `
      )}
    </section>
  `;
}

export default async function RenderPost(req) {
  const postData = await db.posts.get(req.id);
  const result = post(postData);

  // Render into a Response object. This will stream the page.
  return new Response(render(result), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
```

There are 4 exports: `html`, `save`, `render`, and `renderToString`

### html

The main function. It transfroms a `tagged templates string` into an async iterator of strings.

The template string is handled as save. Meaning it will not be html-escaped. Results of an other html function is also html save.

All types are allowed in the expressions of the templates string. They will get stringified (`String(value)`).

Only strings will get html-escaped. Unless they are marked as _save_ by the `save(someText)` function.

Arrays and other iterators are supported.

Promises will get resolved.

### save

This function markes a string as _save_.

Save strings will not get html-escaped. Usefull if you want to render raw html.

```javascript
const content = markdown(post.content);
const response = html`<main>${save(content)}</main>`;
```

### render

Renders an async iterator (or sync iterator) of string, into a format (`ReadableStream<Uint8Array>`) usable on a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response).

Response be streamed.

```javascript
const content = html`<main>${largeContent}</main>`;
const res = new Response(render(result), {
  headers: {
    "Content-Type": "text/html; charset=utf-8",
  },
});
```

### renderToString

Like `render` it takes an an async iterator (or sync iterator) of strings. But it renders into a string.

```typescript
const content = html`<main>${post.content}</main>`;
const result: string = await renderToString(content);
```
