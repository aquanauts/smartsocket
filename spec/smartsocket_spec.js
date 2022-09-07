import {createFakeBrowserWindow} from "../src/support.js"
import {createContext} from "../src/smartsocket.js"

describe('Smartsocket', () => {
    let windowRef, context

    beforeEach(() => {
        windowRef = createFakeBrowserWindow()
        windowRef.timePasses(1234567890001)
        context = createContext(windowRef)
    })

    it('provides millisecond time', async () => {
        expect(context.nowMillis()).toEqual(1234567890001)
    })

    it('can fetch JSON documents', async () => {
        windowRef.setResponse('/some/url', JSON.stringify({one: 2}))
        const result = await context.getJSON('/some/url')
        expect(result).toEqual({one: 2})
    })

    it('can fetch JSON documents in a callback', async () => {
        windowRef.setResponse('/some/url', JSON.stringify({one: 2}))
        let actualResult
        context.getJSON('/some/url').then((response) => response.then((result) => { 
            actualResult = result 
        }))
        expect(actualResult).toEqual({one: 2})
    })

    it('raises an error if a request fails', async () => {
        windowRef.fetch = (url) => Promise.reject("Error!")
        const errors = []
        await context.getJSON('/some/url').catch((error) => errors.push(error))
        expect(errors).toEqual(["Error!"])
    })

    it('can schedule a one shot timer', async () => {
        const callback = jasmine.createSpy('callback')
        context.setTimeout(callback, 1000)
        windowRef.timePasses(1000)
        expect(callback).toHaveBeenCalled()
    })

    it('can schedule an interval timer', async () => {
        const callback = jasmine.createSpy('callback')
        context.setInterval(callback, 1000)
        windowRef.timePasses(1000)
        expect(callback).toHaveBeenCalled()

        windowRef.timePasses(1000)
        expect(callback.calls.count()).toEqual(2)
    })

    it('can subscribe to events', async () => {
        const callback = jasmine.createSpy('callback')
        context.addEventListener('click', callback)
        windowRef.dispatchEvent(new Event('click'))
        expect(callback).toHaveBeenCalled()
    })

    describe('templates', () => {
        it('should clone templates from the template element', function () {
            const templateElem = new DOMParser().parseFromString(`<template>
                <div class="MyElem">Foobar</div>
            </template>`, 'text/html').querySelector('template')
            windowRef.document.body.append(templateElem)
            context.template("MyElem")
        })
    })

    describe('smart socket with a memoizer', () => {
        let socket, rawSocket
        beforeEach(() => {
            socket = context.connect("ws", {memoizer: (memo, message) => {  
                for (let [key, value] of Object.entries(message)) {
                    memo[key] = value
                }
            }})
            rawSocket = windowRef.sockets[`ws://${windowRef.location.host}/ws`]
            rawSocket.onopen()
        });

        function receiveEvent(event) {
            rawSocket.onmessage({data: JSON.stringify(event)})
        }

        it('creates a state snapshot', async () => {
            receiveEvent({name: "Ben Rady"})
            expect(socket.state()).toEqual({name: "Ben Rady"})
        })

        it('can send a raw message', async () => {
            rawSocket.onopen()
            socket.send('foo')
            expect(rawSocket.sentMessages).toEqual(['foo'])
        })

        it('can send a JSON message', async () => {
            rawSocket.onopen()
            socket.sendJSON({foo: "bar"})
            expect(rawSocket.sentMessages).toEqual(['{"foo":"bar"}'])
        })

        it('clears out the state when reconnecting', async () => {
            receiveEvent({type: "a", key: "users-brady-name", value: "Ben Rady"})
            rawSocket.onopen()
            expect(socket.state()).toEqual({})
        })
    });

    describe('smart socket', () => {
        let socket, rawSocket

        beforeEach(() => {
            socket = context.connect("ws")
            rawSocket = windowRef.sockets[`ws://${windowRef.location.host}/ws`]
        })

        function receiveEvent(event) {
            rawSocket.onmessage({data: JSON.stringify(event)})
        }

        it('calls back when a message is received', async () => {
            const expectedMessage = {type: "a", key: "users-brady-name", value: "Ben Rady"}
            const receivedMessages = []
            socket.onJSON((message) => receivedMessages.push(message))
            receiveEvent(expectedMessage)
            expect(receivedMessages).toEqual([{type: "a", key: "users-brady-name", value: "Ben Rady"}])
        })

        it('caches outgoing messages until the websocket is connected', async () => {
            socket.send('foo')
            expect(rawSocket.sentMessages).toEqual([])

            rawSocket.onopen()
            expect(rawSocket.sentMessages).toEqual(['foo'])
        })
    })

    describe('router', () => {
        let routes, viewContainer
        beforeEach(function () {
            viewContainer = windowRef.document.createElement('div')
            windowRef.document.body.append(viewContainer)
            routes = {
                "#view": () => {
                    const view = windowRef.document.createElement('div')
                    view.className = "MainView"
                    view.innerHTML = "Hello"
                    return view
                },
                "#params": (_, viewParams) => {
                    const view = windowRef.document.createElement('div')
                    view.className = 'ParamView'
                    for(let [key, value] of Object.entries(viewParams)) {
                        view.setAttribute(key, value)
                    }
                    return view
                },
                "#async": async () => {
                    const view = windowRef.document.createElement('div')
                    view.className = 'AsyncView'
                    return view
                }
            }
        })

        function changeView(newRoute) {
            windowRef.location.hash = newRoute
            windowRef.dispatchEvent(new Event('hashchange'))
        }

        it('loads the current view when the router is made ready', async () => {
            context.startRouter(routes, viewContainer)
            const view = viewContainer.querySelector('.MainView')
            expect(view.innerHTML).toEqual("Hello")
        })

        it('switches to the new view when the hashchange event is triggered', async () => {
            context.startRouter(routes, viewContainer)
            changeView('#params')
            expect(viewContainer.querySelector('.ParamView')).not.toBeNull()
            expect(viewContainer.querySelector('.MainView')).toBeNull()
        })

        it('can parse routes with query parameters', async () => {
            windowRef.location.hash = '#params?key1=value1&key2=value2'
            context.startRouter(routes, viewContainer)
            const view = viewContainer.querySelector('.ParamView')
            expect(view.getAttribute('key1')).toEqual('value1')
            expect(view.getAttribute('key2')).toEqual('value2')
        })

        it('triggers an event after the view changes', async () => {
            const callback = jasmine.createSpy('callback')
            context.startRouter(routes, viewContainer)
            context.addEventListener('smartsocket.viewChange', callback)
            changeView('#params')
            expect(callback).toHaveBeenCalled()
        })

        it('can use async view functions', async () => {
            windowRef.location.hash = '#async'
            await context.startRouter(routes, viewContainer)
            const view = viewContainer.querySelector('.AsyncView')
            expect(view).not.toBeNull()
        })

        it('cancels timers when the view changes', async () => {
            let ticks = 0
            windowRef.location.hash = '#timer'
            await context.startRouter({...routes, 
                '#timer': (context) => {  
                    context.setInterval(() => { ticks += 1 }, 1000)
                }
            }, viewContainer)
            windowRef.timePasses(1000)
            expect(ticks).toEqual(1)

            changeView('#view')
            windowRef.timePasses(1000)
            expect(ticks).toEqual(1)
        });

        // TODO Cleans up event handlers when the view changes
        
        // TODO Cleans up sockets when the view changes
    })
})

