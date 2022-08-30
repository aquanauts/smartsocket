import {createFakeBrowserWindow} from "../src/support.js"
import {createContext} from "../src/smartsocket.js"

describe('Smartsocket', () => {
    let windowRef, context;

    beforeEach(() => {
        windowRef = createFakeBrowserWindow();
        windowRef.timePasses(1234567890001);
        context = createContext(windowRef);
    });

    it('provides millisecond time', async () => {
        expect(context.nowMillis()).toEqual(1234567890001);
    });

    describe('templates', () => {
        it('should clone templates from the template element', function () {
            const templateElem = new DOMParser().parseFromString(`<template>
                <div class="MyElem">Foobar</div>
            </template>`, 'text/html').querySelector('template');
            windowRef.document.body.append(templateElem);
            context.template("MyElem")
        });
    });

    describe('smart socket', () => {
        let socket, rawSocket;

        beforeEach(() => {
            socket = context.connect("ws");
            rawSocket = windowRef.sockets[`ws://${windowRef.location.host}/ws`]
        });

        function sendEvent(event) {
            rawSocket.onmessage({data: JSON.stringify(event)});
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
            rawSocket.onopen();
            socket.send('foo');
            expect(rawSocket.sentMessages).toEqual(['foo']);
        });

        it('caches outgoing messages until the websocket is connected', async () => {
            socket.send('foo');
            expect(rawSocket.sentMessages).toEqual([]);

            rawSocket.onopen();
            expect(rawSocket.sentMessages).toEqual(['foo']);
        });

        it('clears out the state when reconnecting', async () => {
            sendEvent({type: "a", key: "users-brady-name", value: "Ben Rady"});
            rawSocket.onopen();
            expect(socket.state()).toEqual({});
        });
    });

    describe('router', () => {
        let routes;
        beforeEach(function () {
            routes = {
                "#view": () => {
                    const view = windowRef.document.createElement('div')
                    view.className = "MainView";
                    view.innerHTML = "Hello";
                    return view;
                },
                "#params": (_, viewParams) => {
                    const view = windowRef.document.createElement('div');
                    view.className = 'ParamView'
                    for(let [key, value] of viewParams.entries()) {
                        view.setAttribute(key, value);
                    }
                    return view;
                }
            };
        });

        it('loads the current view when the router is made ready', async () => {
            const viewContainer = context.startRouter(routes);
            const view = viewContainer.querySelector('.MainView');
            expect(view.innerHTML).toEqual("Hello");
        });

        it('switches to the new view when the hashchange event is triggered', async () => {
            const viewContainer = context.startRouter(routes);
            windowRef.location.hash = '#params';
            windowRef.dispatchEvent(new Event('hashchange'));
            expect(viewContainer.querySelector('.ParamView')).not.toBeNull();
            expect(viewContainer.querySelector('.MainView')).toBeNull();
        });

        it('can parse routes with query parameters', async () => {
            windowRef.location.hash = '#params?key1=value1&key2=value2';
            const viewContainer = context.startRouter(routes);
            const view = viewContainer.querySelector('.ParamView');
            expect(view.getAttribute('key1')).toEqual('value1');
            expect(view.getAttribute('key2')).toEqual('value2');
        });
    });
})

