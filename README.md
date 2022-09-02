
# Smartsocket

Smartsocket is a zero dependency library for building websocket-based single page web applications, [suitable for trading systems in the finance industry](https://twitter.com/twoscp/status/1559291172107026436). It is based off the [reconnecting-websocket](https://github.com/joewalnes/reconnecting-websocket) library by [Joe Walnes](https://github.com/joewalnes) and the book [Serverless Single Page Apps](https://pragprog.com/titles/brapps/serverless-single-page-apps/) by [Ben Rady](https://github.com/benrady). 

## What's Included?

### Incremental Updates via WebSocket

A common technique in the finance industry is to record application state as a series of Add/Remove/Modify events. These events are used to create a Map that holds the state, matching keys (ex: an Order Id) to complex objects (ex: an Order message). This makes it easy to "snapshot" the application state by generating a sequence of synthetic add events, one for each entry in the Map. This technique has been successfully used in both trading systems and electronic exchanges. Smartsocket brings this technique to web applications, allowing for efficient incremental updates of data in real time.

### Hash-Based Routing

Like many single page applications, Smartsocket keeps track of view state by changing the URL hash. This allows the application to switch from one "page" to another without reloading. This not only makes for a smoother user experience, but also makes it easy to persist and cache data between page transitions.

### Custom Events

TODO

### HTML Templating

Smartsocket uses the web standard [template](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) element for HTML templating, allowing you to build simple web applications without any external dependencies.

### Test-First Design

We believe that you should be able to create [fast, informative, and reliable automated tests](https://www.benrady.com/2016/11/testing-with-fire.html) for every aspect of your web application. Smartsocket is designed with that goal in mind. It provides a fake `window` implementation that, while not a comprehensive impelemention of the [web standard](https://developer.mozilla.org/en-US/docs/Web/API/Window), is sufficient to control every aspect of browser behavior that you need to test an application built with Smartsocket.

## What's Not Included

Here are some things you you might expect to have in a "web framework". Smartsocket doesn't have these.

* Data binding
* A virtual DOM
* A server (aside from the example server)

## Example

For a demo, clone the repository and run `make example`. Each view in this application demonstrates a different part of Smartsocket's functionality.

## FAQ

_Do you have to use all of this at once?_

No! You can use the WebSocket without using the router. You can use the router without using the templates. You can use the templates without using the WebSocket. If you DO use all these things together, you get some nice guarantees about how they work together, but you can use them all seperately.

_How do I install it?_

[Download a version](https://github.com/aquanauts/smartsocket/tags) and add `smartsocket.js` to your application. If you want to write tests, you'll probably want to add `support.js` as well.

_Is there an NPM installation?_

Not yet

_Is it available in a CDN?_

Not yet
