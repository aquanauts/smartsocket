"use strict"

const control = (function () {
    function connect(config) {
        const socketFn = config.socketFn || ((url, protocols) => new WebSocket(url, protocols))
        const protocols = []
        const options = {}
        const socket = new InternalSocket(config.url, protocols, options, socketFn)
        initSocket(socket, config.window || window)
        return socket
    }

    function readProperty(obj, path) {
        var arr = path.split('.')
        while (arr.length) {
            obj = obj[arr.shift()]
        }
        return obj
    }

    function initSocket(socket, windowRef) {
        const statCache = {}
        let dirtyStats = new Set()
        socket.onopen = (e) => {
            flushCache()
        }

        socket.onmessage = (e) => {
            const result = eval(e.data);
            socket.send(`$_:${JSON.stringify(result)}`)
        }

        function tick() {
            for(let property of polledProperties) {
                const newVal = readProperty(windowRef, property)
                if (statCache[property] !== newVal) {
                    dirtyStats.add(property)
                    statCache[property] = newVal
                }
            }
            flushCache()
        }

        function flushCache() {
            const writableStats = Array.from(dirtyStats)
            while(writableStats.length && socket.readyState === InternalSocket.OPEN) {
                const statName = writableStats.shift();
                socket.send(`${statName}:${statCache[statName]}`)
                dirtyStats.delete(statName);
            }
        }

        function writeStats(properties) {
            for(let property of properties) {
                const newVal = readProperty(windowRef, property);
                dirtyStats.add(property)
                statCache[property] = newVal
            }
            flushCache()
        }

        const staticProperties = [
            'location.host'
        ]

        const trackedProperties = [
            ['hashchange', ['location.hash']],
            ['resize', ['innerHeight', 'innerWidth']]
        ]

        const polledProperties = [
            'navigator.cookieEnabled',
            'document.documentElement.outerHTML'
        ]

        for (let [eventName, properties] of trackedProperties) {
            writeStats(properties)
            windowRef.addEventListener(eventName, () => { writeStats(properties) })
        }

        writeStats(staticProperties)

        windowRef.setInterval(tick, 1000);
        tick();
    }

    function InternalSocket(url, protocols, options, socketFn) {
        var settings = {
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
        for (var key in settings) {
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

        var self = this
        var ws
        var forcedClose = false
        var timedOut = false
        var eventTarget = document.createElement('div')

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
            var evt = document.createEvent("CustomEvent")
            evt.initCustomEvent(s, false, false, args)
            return evt
        }

        this.open = function (reconnectAttempt) {
            ws = socketFn(self.url, protocols || [])
            ws.binaryType = this.binaryType

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'))
                this.reconnectAttempts = 0
            }

            var localWs = ws
            var timeout = setTimeout(function() {
                timedOut = true
                localWs.close()
                timedOut = false
            }, self.timeoutInterval)

            ws.onopen = function(event) {
                clearTimeout(timeout)
                self.protocol = ws.protocol
                self.readyState = WebSocket.OPEN
                self.reconnectAttempts = 0
                var e = generateEvent('open')
                e.isReconnect = reconnectAttempt
                reconnectAttempt = false
                eventTarget.dispatchEvent(e)
            }

            ws.onclose = function(event) {
                clearTimeout(timeout)
                ws = null
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED
                    eventTarget.dispatchEvent(generateEvent('close'))
                } else {
                    self.readyState = WebSocket.CONNECTING
                    var e = generateEvent('connecting')
                    e.code = event.code
                    e.reason = event.reason
                    e.wasClean = event.wasClean
                    eventTarget.dispatchEvent(e)
                    if (!reconnectAttempt && !timedOut) {
                        eventTarget.dispatchEvent(generateEvent('close'))
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts)
                    setTimeout(function() {
                        self.reconnectAttempts++
                        self.open(true)
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout)
                }
            }
            ws.onmessage = function(event) {
                var e = generateEvent('message')
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
        this.send = function(data) {
            if (ws) {
                return ws.send(data)
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
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN
     * this indicates that the connection is ready to send and receive data.
     */
    InternalSocket.prototype.onopen = function(event) {}
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    InternalSocket.prototype.onclose = function(event) {}
    /** An event listener to be called when a connection begins being attempted. */
    InternalSocket.prototype.onconnecting = function(event) {}
    /** An event listener to be called when a message is received from the server. */
    InternalSocket.prototype.onmessage = function(event) {}
    /** An event listener to be called when an error occurs. */
    InternalSocket.prototype.onerror = function(event) {}

    InternalSocket.CONNECTING = WebSocket.CONNECTING
    InternalSocket.OPEN = WebSocket.OPEN
    InternalSocket.CLOSING = WebSocket.CLOSING
    InternalSocket.CLOSED = WebSocket.CLOSED

    return {
        connect: connect,
    }
})()
