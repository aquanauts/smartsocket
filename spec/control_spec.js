"use strict"

describe('Control socket', () => {
    var stubSocket
    var stubWindow
    var sentMessages
    var eventListeners
    var intervalFn
    var timeoutFns

    beforeEach(() => {
        eventListeners = {}
        timeoutFns = {}
        stubWindow = {
            location: { host: 'localhost:12345', hash: ''},
            navigator: { cookieEnabled: true},
            innerHeight: 600,
            innerWidth: 400,
            document: {
                documentElement: { outerHTML: "<html>" }
            },
            addEventListener: (eventName, callback) => {
                eventListeners[eventName] = callback
            },
            setInterval: (fn) => { intervalFn = fn },
            setTimeout: (fn, duration) => { timeoutFns[duration] = fn },
            WebSocket: function(url, protocols) {
                stubSocket = this
                this.close = () => { stubSocket.readyState = WebSocket.CLOSED }
                this.send = (msg) => { sentMessages.push(JSON.parse(msg)) }
            }
        }
        sentMessages = []
    })

    describe('connect', () => {
        var socket

        beforeEach(() => {
            socket = control.connect({
                url: "localhost:1234",
                window: stubWindow
            })
        })

        it('sends tracked properties when connecting', async () => {
            stubSocket.onopen()
            expect(sentMessages).toContain({"location.hash":""})
        })

        it('sends static properties when connecting', async () => {
            stubSocket.onopen()
            expect(sentMessages).toContain({'location.host':'localhost:12345'})
        })

        it('does not send stats until connected', async () => {
            expect(sentMessages).toEqual([])
        })

        it('sends tracked properties when they change', async () => {
            stubSocket.onopen()
            stubWindow.location.hash = '#newhash'
            eventListeners['hashchange']()
            expect(sentMessages).toContain({'location.hash':'#newhash'})
        })

        it('sends polled properties when connected', async () => {
            stubSocket.onopen()
            expect(sentMessages).toContain({'navigator.cookieEnabled':true})
        })

        it('only sends polled properties when they change', async () => {
            stubSocket.onopen()
            sentMessages = []
            stubWindow.navigator.cookieEnabled = false
            intervalFn()
            intervalFn()
            expect(sentMessages).toEqual([{'navigator.cookieEnabled':false}])
        })

        it('evaluates any message sent', async () => {
            stubSocket.onmessage({data: "1+1"})
            expect(sentMessages).toEqual([{'$_':2}])
        })

        it('sends an error object if evaluation fails', async () => {
            stubSocket.onmessage({data: "1+"})
            let error = sentMessages[0]['$__']
            expect(error.message).toEqual("Unexpected end of input")
            expect(error.stack).toContain("WebSocket.ws.onmessage")
        })
    })

    describe('internal socket', () => {
        let socket
        let callback

        beforeEach(() => {
            socket = new control.InternalSocket("localhost:1234", stubWindow)
            callback = jasmine.createSpy('callback')
        })

        it('provides the URL as a read-only property', async () => {
            expect(socket.url).toEqual("localhost:1234")
            expect(Object.getOwnPropertyDescriptor(socket, 'url').writable).toBeFalsy()
        })

        it('tracks the number of reconnect attempts', async () => {
            expect(socket.reconnectAttempts).toEqual(0)
            stubSocket.onclose({})
            timeoutFns[1000](); // 1000ms reconnect timer
            expect(socket.reconnectAttempts).toEqual(1)
            expect(Object.getOwnPropertyDescriptor(socket, 'reconnectAttempts').writable).toBeFalsy()
        })

        it('provides the websocket protocol', async () => {
            stubSocket.protocol = 'https'
            stubSocket.onopen()
            expect(socket.protocol).toEqual('https')
            expect(Object.getOwnPropertyDescriptor(socket, 'protocol').writable).toBeFalsy()
        })

        it('fires a closing event when closing', async () => {
            socket.addEventListener('close', callback)
            stubSocket.onclose({})
            expect(callback).toHaveBeenCalled()
        })

        it('fires an event when a message is received', async () => {
            socket.addEventListener('message', callback)
            stubSocket.onmessage({data: "my data"})
            expect(callback).toHaveBeenCalled()
            const event = callback.calls.argsFor(0)[0]
            expect(event.data).toEqual("my data")
        })

        it('fires an event when an error occurs', async () => {
            socket.addEventListener('close', callback)
            stubSocket.onclose({})
            expect(callback).toHaveBeenCalled()
        })

        it('fires a connecting event when closing', async () => {
            socket.addEventListener('connecting', callback)
            stubSocket.onclose({code: 42, reason: "a reason", wasClean: false})
            expect(callback).toHaveBeenCalled()
            const event = callback.calls.argsFor(0)[0]
            expect(event.code).toEqual(42)
            expect(event.reason).toEqual('a reason')
            expect(event.wasClean).toEqual(false)
        })

        it('fires an event when opening', async () => {
            socket.addEventListener('open', callback)
            stubSocket.onopen({})
            expect(callback).toHaveBeenCalled()
        })

        it('fires an open event when connecting', async () => {
            socket.addEventListener('connecting', callback)
            socket.open()
            expect(callback).toHaveBeenCalled()
        })

        it('sets the binary type when opening', async () => {
            socket.open()
            expect(stubSocket.binaryType).toEqual('blob');
        });

        it('schedules a connection timeout when opening', async () => {
            socket.addEventListener('close', callback)
            stubSocket.close = callback
            timeoutFns[2000]() // Simulate the timeout
            expect(callback).toHaveBeenCalled()
        });

        it('does not trigger a close event when a connect times out', async () => {
            socket.addEventListener('close', callback)
            stubSocket.close = () => {
                // Simulate the socket closing immediately
                stubSocket.onclose({})
            }
            timeoutFns[2000]() // Simulate the timeout
            expect(callback).not.toHaveBeenCalled()
        });
    })
})
