export function createFakeBrowserWindow() {
    const listeners = {};
    const responses = {};
    const socketSequences = {};
    const scheduledTimeouts = {};
    const sockets = {};
    let currTime = 0;
    const fakeDocument = new Document();
    const body = fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "body")
    const html = fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "html");
    html.appendChild(fakeDocument.createElementNS("http://www.w3.org/1999/xhtml", "head"));
    html.appendChild(body);
    fakeDocument.appendChild(html);
    fakeDocument.body = body;

    class StubSocket {
        constructor(url) {
            this.url = url;
            this.sentMessages = [];
            sockets[url] = this;
        }
        send(msg) {
            this.sentMessages.push(msg)
        }
    }

    function setResponse(url, jsonObject) {
        responses[url] = jsonObject;
    }

    function fakeSetTimeout(callback, interval) {
        const scheduleTime = interval + currTime;
        if (!(scheduleTime in scheduledTimeouts)) {
            scheduledTimeouts[scheduleTime] = [];
        }
        scheduledTimeouts[scheduleTime].push(callback);
    }
    return {
        addEventListener: (eventType, callback) => {
            if (!(eventType in listeners)) {
                listeners[eventType] = [];
            }
            listeners[eventType].push(callback);
        },
        dispatchEvent: (event) => {
            for(let listener of listeners[event.type]) {
                listener(event);
            }
        },
        setInterval: (callback, interval) => {
            fakeSetTimeout(() => {
                callback();
                fakeSetTimeout(callback, interval);
            }, interval);
        },
        setTimeout: fakeSetTimeout,
        timePasses: (interval) => {
            currTime += interval;
            for (let [scheduleTime, callbacks] of Object.entries(scheduledTimeouts)) {
                if (scheduleTime <= currTime) {
                    for(let callback of callbacks) {
                        callback();
                    }
                    delete scheduledTimeouts[scheduleTime];
                }
            }
        },
        location: {
            hash: '#view',
            host: window.location.host
        },
        document: fakeDocument,
        fetch: (url) => {
            return Promise.resolve({
                json: () => {
                    return Promise.resolve(responses[url]);
                }
            });
        },
        Date: {
            now: () => currTime
        },
        WebSocket: StubSocket,
        sockets,
        smartsocket: {
            connect: (config) => {
                function createFakeSocket(sequence) {
                    const socket = {
                        send: (message) => {
                            let expectedMessage = sequence.shift();
                            if (message in expectedMessage) {
                                for (let dataMessage of expectedMessage[message]) {
                                    socket.onmessage({data: dataMessage});
                                }
                            }
                        }
                    };
                    return socket;
                }

                let unopenedSocket;
                config.socketFn = (url, protocols) => {
                    unopenedSocket = createFakeSocket(socketSequences[url])
                    return unopenedSocket;
                };
                let ss = smartsocket.connect(config);
                unopenedSocket.onopen();
                return ss;
            }
        },
        addSocketSequence: (url, sequence) => {
            socketSequences[`ws://${window.location.host}${url}`] = sequence;
        },
        setResponse
    };
}

