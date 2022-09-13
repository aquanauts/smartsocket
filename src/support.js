/**
 * Unlike A+ standard Promises, Deferreds which are already resolved or
 * rejected invoke their callback synchronously.
 *
 * This makes testing much easier.
 */
export class Deferred {
    constructor(handler) {
        this.status = "pending";
        this.value = null;

        const resolve = value => {
            if (this.status === "pending") {
                this.status = "fulfilled";
                this.value = value;
            }
        };
        const reject = value => {
            if (this.status === "pending") {
                this.status = "rejected";
                this.value = value;
            }
        };

        try {
            handler(resolve, reject);
        } catch (err) {
            reject(err);
        }
    }

    then(onFulfilled, onRejected) {
        if (this.status === "fulfilled") {
            return Deferred.resolve(onFulfilled(this.value));
        } else if (this.status === "rejected") {
            return Deferred.reject(onRejected(this.value));
        }
    }

    catch(onRejected) {
        return this.then(() => {}, onRejected)
    }

    finally(onFinally) {
        return this.catch(() => { onFinally() }, () => { onFinally() })
    }

    static resolve(value) {
        return new Deferred((resolve, reject) => {
            resolve(value);
        })
    }

    static reject(error) {
        return new Deferred((resolve, reject) => {
            reject(error);
        })
    }
}

export function createFakeBrowserWindow(options) {
    const listeners = {}
    const responses = {}
    const socketSequences = {}
    const scheduledTimeouts = {}
    const callbackIndex = []
    const sockets = {}
    let currTime = 0
    const fakeDocument = new Document()
    const body = fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "body")
    const html = fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "html")
    html.appendChild(fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "head"))
    html.appendChild(body)
    fakeDocument.appendChild(html)
    fakeDocument.body = body

    class StubSocket {
        constructor(url) {
            this.url = url
            this.sentMessages = []
            this.readyState = WebSocket.CONNECTING
            sockets[url] = this
        }
        send(msg) {
            this.sentMessages.push(msg)
        }
        close() {
            this.readyState = WebSocket.CLOSED
        }
        deliver(msg) {
            this.onmessage({data: msg})
        }
    }

    function setResponse(url, responseBody) {
        responses[url] = responseBody
    }

    function scheduleCallback(callbackId, interval) {
        const scheduleTime = interval + currTime
        if (!(scheduleTime in scheduledTimeouts)) {
            scheduledTimeouts[scheduleTime] = []
        }
        scheduledTimeouts[scheduleTime].push(callbackId)
    }

    function fakeSetTimeout(callback, interval) {
        callbackIndex.push(callback)
        const callbackId = callbackIndex.length - 1
        scheduleCallback(callbackId, interval)
        return callbackId
    }

    return {
        addEventListener: (eventType, callback) => {
            if (!(eventType in listeners)) {
                listeners[eventType] = []
            }
            listeners[eventType].push(callback)
        },
        removeEventListener: (eventType, callback) => {
            const index = listeners[eventType].indexOf(callback)
            listeners[eventType].splice(index, 1)
        },
        dispatchEvent: (event) => {
            for(let listener of listeners[event.type] || []) {
                listener(event)
            }
        },
        setInterval: (callback, interval) => {
            const intervalId = fakeSetTimeout(() => {
                callback()
                scheduleCallback(intervalId, interval)
            }, interval)
            return intervalId
        },
        clearInterval: (intervalId) => {
            callbackIndex[intervalId] = undefined
        },
        setTimeout: fakeSetTimeout,
        timePasses: (interval) => {
            currTime += interval
            for (let [scheduleTime, callbackIds] of Object.entries(scheduledTimeouts)) {
                if (scheduleTime <= currTime) {
                    for(let callbackId of callbackIds) {
                        const callback = callbackIndex[callbackId] || (() => {})
                        callback()
                    }
                    delete scheduledTimeouts[scheduleTime]
                }
            }
        },
        location: {
            hash: '#view',
            host: window.location.host
        },
        document: fakeDocument,
        fetch: (url) => {
            if (url in responses) {
                return Deferred.resolve({
                    json: () => Deferred.resolve(JSON.parse(responses[url]))
                })
            } else {
                return Deferred.reject("No response set for url: " + url)
            }
        },
        Date: {
            now: () => currTime
        },
        WebSocket: StubSocket,
        sockets,
        addSocketSequence: (url, sequence) => {
            socketSequences[`ws://${window.location.host}${url}`] = sequence
        },
        setResponse
    }
}

export async function fetchTemplates(url) {
    const response = await fetch(url)
    const markup = await response.text()
    const doc = new DOMParser().parseFromString(markup, 'text/html')
    return doc.querySelector('template')
}
