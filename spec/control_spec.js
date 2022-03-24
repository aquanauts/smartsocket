"use strict"

describe('Control socket', () => {
    var stubSocket
    var stubWindow
    var sentMessages
    var socket
    var eventListeners
    var intervalFn

    beforeEach(() => {
        eventListeners = {}
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
            setInterval: (fn) => { intervalFn = fn }
        }
        sentMessages = []
        stubSocket = {
            close: () => { stubSocket.readyState = WebSocket.CLOSED },
            send: function (msg) { sentMessages.push(msg) },
        }
        socket = control.connect({
            url: "localhost:1234",
            window: stubWindow,
            socketFn: () => stubSocket
        })
        socket.readyState = WebSocket.OPEN
    })

    it('sends tracked properties when connecting', async () => {
        stubSocket.onopen()
        expect(sentMessages).toContain('location.hash:')
    })

    it('sends static properties when connecting', async () => {
        stubSocket.onopen()
        expect(sentMessages).toContain('location.host:localhost:12345')
    })

    it('does not send stats until connected', async () => {
        expect(sentMessages).toEqual([])
    })

    it('sends tracked properties when they change', async () => {
        stubSocket.onopen()
        stubWindow.location.hash = '#newhash'
        eventListeners['hashchange']()
        expect(sentMessages).toContain('location.hash:#newhash')
    })

    it('sends polled properties when connected', async () => {
        stubSocket.onopen()
        expect(sentMessages).toContain('navigator.cookieEnabled:true')
    })

    it('only sends polled properties when they change', async () => {
        stubSocket.onopen()
        sentMessages = []
        stubWindow.navigator.cookieEnabled = false
        intervalFn()
        intervalFn()
        expect(sentMessages).toEqual(['navigator.cookieEnabled:false'])
    })
})
