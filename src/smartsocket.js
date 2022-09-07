// TODO Add specific methods for these
export const events = {
    viewChange: () => new CustomEvent('smartsocket.viewChange')
}

// TODO Just return the reconnecting socket here?
function createSocket(socket, config) {
    const callbacks = [];
    let memo = {}

    socket.onmessage = function (e) { 
        const message = JSON.parse(e.data)
        if (config.memoizer) {
            config.memoizer(memo, message)
        }
        for (let callback of callbacks) {
            callback(message)
        }
    }

    socket.onopen = () => {
        memo = {}
    }

    function state() {
        return memo
    }

    function sendJSON(message) {
        socket.send(JSON.stringify(message))
    }

    function onJSON(callback) {
        callbacks.push(callback)
    }

    return {
        state,
        sendJSON,
        onJSON,
        send: function(message) {
            socket.send(message)
        },
    }
}

export function createContext(windowRef) {
    windowRef = windowRef || window

    function ReconnectingSmartSocket(url, protocols, options) {
        let settings = {
            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,

            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,

            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (let key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key]
            } else {
                this[key] = settings[key]
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null

        // Private state variables

        let self = this
        let ws
        let forcedClose = false
        let timedOut = false
        let eventTarget = document.createElement('div')

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); })
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); })
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); })
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); })
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); })

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget)
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget)
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget)

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
            let evt = document.createEvent("CustomEvent")
            evt.initCustomEvent(s, false, false, args)
            return evt
        }

        this.open = function (reconnectAttempt) {
            ws = new windowRef.WebSocket(self.url, protocols || [])
            ws.binaryType = this.binaryType

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'))
                this.reconnectAttempts = 0
            }

            let localWs = ws
            let timeout = windowRef.setTimeout(function() {
                timedOut = true
                localWs.close()
                timedOut = false
            }, self.timeoutInterval)

            ws.onopen = function(event) {
                clearTimeout(timeout)
                self.protocol = ws.protocol
                self.readyState = WebSocket.OPEN
                self.reconnectAttempts = 0
                let e = generateEvent('open')
                e.isReconnect = reconnectAttempt
                reconnectAttempt = false
                eventTarget.dispatchEvent(e)

                for (let message of cachedMessages) {
                    ws.send(message)
                }
                cachedMessages = []
            }

            ws.onclose = function(event) {
                clearTimeout(timeout)
                ws = null
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED
                    eventTarget.dispatchEvent(generateEvent('close'))
                } else {
                    self.readyState = WebSocket.CONNECTING
                    let e = generateEvent('connecting')
                    e.code = event.code
                    e.reason = event.reason
                    e.wasClean = event.wasClean
                    eventTarget.dispatchEvent(e)
                    if (!reconnectAttempt && !timedOut) {
                        eventTarget.dispatchEvent(generateEvent('close'))
                    }

                    let timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts)
                    windowRef.setTimeout(function() {
                        self.reconnectAttempts++
                        self.open(true)
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout)
                }
            }
            ws.onmessage = function(event) {
                let e = generateEvent('message')
                e.data = event.data
                eventTarget.dispatchEvent(e)
            }
            ws.onerror = function(event) {
                eventTarget.dispatchEvent(generateEvent('error'))
            }
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false)
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        let cachedMessages = []
        this.send = function(data) {
            if (ws) {
                if (self.readyState === WebSocket.OPEN) {
                    return ws.send(data)
                } else {
                    cachedMessages.push(data)
                }
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket'
            }
        }

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000
            }
            forcedClose = true
            if (ws) {
                ws.close(code, reason)
            }
        }

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close()
            }
        }
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingSmartSocket.prototype.onopen = function(event) {}
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingSmartSocket.prototype.onclose = function(event) {}
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingSmartSocket.prototype.onconnecting = function(event) {}
    /** An event listener to be called when a message is received from the server. */
    ReconnectingSmartSocket.prototype.onmessage = function(event) {}
    /** An event listener to be called when an error occurs. */
    ReconnectingSmartSocket.prototype.onerror = function(event) {}

    ReconnectingSmartSocket.CONNECTING = WebSocket.CONNECTING
    ReconnectingSmartSocket.OPEN = WebSocket.OPEN
    ReconnectingSmartSocket.CLOSING = WebSocket.CLOSING
    ReconnectingSmartSocket.CLOSED = WebSocket.CLOSED


    function template(name) {
        const templates = windowRef.document.querySelector('template').content
        // TODO Be a little more defensive here in case there are colliding names
        const node = templates.querySelector("." + name)
        if (node === null) {
            throw new Error(`Could not find a node with class '${name}' in the <template> element`)
        }
        return node.cloneNode(true)
    }

    function getJSON(url, options, callback) {
        callback = callback || ((value) => value)
        return windowRef.fetch(url, options).then((response) => response.json().then(callback))
    }

    function parseRoute(routes) {
        const hash = windowRef.location.hash
        const viewName = currentView()
        const viewFn = routes[viewName]
        const params = {}
        for (const [key, value] of new URLSearchParams(hash.split('?')[1])) {
            params[key] = value
        }
        return [params, viewFn]
    }

    async function showView(routes, viewContainer) {
        cleanupResources()
        const [viewParams, viewFn] = parseRoute(routes)
        let view
        if (viewFn.constructor.name === 'AsyncFunction') {
            view = await viewFn(context, viewParams)
        } else {
            view = viewFn(context, viewParams)
        }
        viewContainer.replaceChildren(view)
        windowRef.dispatchEvent(new CustomEvent('smartsocket.viewChange'))
    }

    function cleanupResources() {
        for (let id of timerIds) {
            windowRef.clearInterval(id)
        }
        timerIds = []

        for(let socket of sockets) {
            socket.close()
        }
        sockets = []
    }

    function connect(config) {
        windowRef = windowRef || window
        const protocols = []
        const options = {}
        const socket = new ReconnectingSmartSocket(config.url, protocols, options)
        sockets.push(socket)
        return createSocket(socket, config)
    }

    function startRouter(routes, viewContainer) {
        windowRef.addEventListener("hashchange", async () => {
            await showView(routes, viewContainer)
            return false
        })
        return showView(routes, viewContainer)
    }

    function currentView() {
        return windowRef.location.hash.split('?')[0]
    }

    function _setInterval(callback, interval) {
        const intervalID = windowRef.setInterval(callback, interval)
        timerIds.push(intervalID)
        return intervalID
    }

    function _setTimeout(callback, interval) {
        const timeoutID = windowRef.setTimeout(callback, interval)
        timerIds.push(timeoutID)
        return timeoutID
    }

    let timerIds = []
    let sockets = []

    const context = {
        addEventListener: (type, callback) => windowRef.addEventListener(type, callback),
        setInterval: _setInterval,
        setTimeout: _setTimeout,
        getJSON,
        template,
        startRouter,
        currentView,
        nowMillis: () => windowRef.Date.now(),
        connect: (path, options) => {
            return connect({url:`ws://${windowRef.location.host}/${path}`, ...options}, windowRef)
        },
    }

    return context
}
