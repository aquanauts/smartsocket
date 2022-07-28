"use strict";

describe('Smartsocket', () => {
    let stubSocket;
    let sentMessages;
    let socket;

    beforeEach(() => {
        sentMessages = [];
        stubSocket = {
            send: function (msg) { sentMessages.push(msg) }
        };
        socket = smartsocket.connect({
            url: "localhost:1234",
            parser: JSON.parse,
            socketFn: () => stubSocket
        });
    });

    function sendEvent(event) {
        stubSocket.onmessage({data: JSON.stringify(event)});
    }

    it('adds to the socket state', async () => {
        sendEvent({type: "a", key: "users-brady-name", value: "Ben Rady"});
        expect(socket.state()).toEqual({"users-brady-name": "Ben Rady"});
    });

    it('deletes from the socket state', async () => {
        sendEvent({type: "a", key: "users-brady-name", value: "Ben Rady"});
        sendEvent({type: "d", key: "users-brady-name"});
        expect(socket.state()).toEqual({});
    });

    it('calls back when a key is added', async () => {
        const adds = [];
        socket.onAdd((...args) => adds.push(args));
        sendEvent({type: "a", key: "users-brady-name", value: "Ben Rady"});
        expect(adds).toEqual([['users-brady-name', 'Ben Rady']]);
    });

    it('calls back when a key is deleted', async () => {
        const deletes = [];
        socket.onDelete((...args) => deletes.push(args));
        sendEvent({type: "d", key: "users-brady-name"});
        expect(deletes).toEqual([['users-brady-name']]);
    });

    it('can send a message', async () => {
        stubSocket.onopen();
        socket.send('foo');
        expect(sentMessages).toEqual(['foo']);
    });

    it('caches outgoing messages until the websocket is connected', async () => {
        socket.send('foo');
        expect(sentMessages).toEqual([]);

        stubSocket.onopen();
        expect(sentMessages).toEqual(['foo']);
    });

    it('clears out the state when reconnecting', async () => {
        sendEvent({type: "a", key: "users-brady-name", value: "Ben Rady"});
        stubSocket.onopen();
        expect(socket.state()).toEqual({});
    });
});
