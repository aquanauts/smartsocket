"use strict"

const control = (function () {
    function connect(config) {
        const windowRef = config.window || window
        const socket = new InternalSocket(config.url, windowRef)
        initSocket(socket, windowRef)
        return socket
    }

    function readProperty(obj, path) {
        let arr = path.split('.')
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
            try {
                const result = eval(e.data.toString());
                send("$_", result)
            } catch(e) {
                send("$__", {message: e.message, stack: e.stack})
            }
        }

        function send(key, value) {
            const msg = {}
            msg[key] = value
            socket.send(JSON.stringify(msg))
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
                send(statName, statCache[statName])
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

    function InternalSocket(url, windowRef) {
        // Settings
        const reconnectInterval = 1000
        const maxReconnectInterval = 30000
        const reconnectDecay = 1.5
        const timeoutInterval = 2000
        const binaryType = 'blob'

        // Public state
        let reconnectAttempts = 0
        let readyState = WebSocket.CONNECTING
        let protocol = null
        Object.defineProperty(this, "url", {
            value: url,
            writable: false
        })
        Object.defineProperty(this, "reconnectAttempts", {
            get: () => reconnectAttempts
        })
        Object.defineProperty(this, "readyState", {
            get: () => readyState
        })
        Object.defineProperty(this, "protocol", {
            get: () => protocol
        })


        // Private state

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
            ws = new windowRef.WebSocket(url, [])
            ws.binaryType = binaryType

            if (!reconnectAttempt) {
                eventTarget.dispatchEvent(generateEvent('connecting'))
                reconnectAttempts = 0
            }

            let localWs = ws
            let timeout = windowRef.setTimeout(function() {
                timedOut = true
                localWs.close()
                timedOut = false
            }, timeoutInterval)

            ws.onopen = function(event) {
                clearTimeout(timeout)
                protocol = ws.protocol
                readyState = WebSocket.OPEN
                reconnectAttempts = 0
                let e = generateEvent('open')
                e.isReconnect = reconnectAttempt
                reconnectAttempt = false
                eventTarget.dispatchEvent(e)
            }

            ws.onclose = function(event) {
                clearTimeout(timeout)
                ws = null
                if (forcedClose) {
                    readyState = WebSocket.CLOSED
                    eventTarget.dispatchEvent(generateEvent('close'))
                } else {
                    readyState = WebSocket.CONNECTING
                    let e = generateEvent('connecting')
                    e.code = event.code
                    e.reason = event.reason
                    e.wasClean = event.wasClean
                    eventTarget.dispatchEvent(e)
                    if (!reconnectAttempt && !timedOut) {
                        eventTarget.dispatchEvent(generateEvent('close'))
                    }

                    let timeout = reconnectInterval * Math.pow(self.reconnectDecay, reconnectAttempts)
                    windowRef.setTimeout(function() {
                        reconnectAttempts++
                        self.open(true)
                    }, timeout > maxReconnectInterval ? maxReconnectInterval : timeout)
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

        this.open(false)

        /**
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

    InternalSocket.prototype.onopen = () => {}
    InternalSocket.prototype.onclose = () => {}
    InternalSocket.prototype.onconnecting = () => {}
    InternalSocket.prototype.onmessage = () => {}
    InternalSocket.prototype.onerror = () => {}

    InternalSocket.CONNECTING = WebSocket.CONNECTING
    InternalSocket.OPEN = WebSocket.OPEN
    InternalSocket.CLOSING = WebSocket.CLOSING
    InternalSocket.CLOSED = WebSocket.CLOSED

    return {
        connect: connect,
    }
})()
