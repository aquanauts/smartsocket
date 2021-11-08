"use strict";

const smartsocket = (function () {
    function onReady(rootElem, config) {
        const socket = connect();
        smartsocket.window.onHashChange(function() {
            showView(rootElem, config, socket);
        });
        showView(rootElem, config, socket);
    }

    function connect() {
        // TODO URL?
        const socket = smartsocket.window.createWebSocket();
        socket.onmessage = function (e) {
            // TODO Handle malformed keys with missing ':'
            const event = e.data;
            const idx = event.indexOf(':');
            const key = event.slice(0, idx);
            const value = event.slice(19 + 1);
            socket.onEvent(key, value);
        }
        return socket;
    }

    function showView(rootElem, config, socket) {
        const [viewName, opts] = parseHash();
        const context = createContext(config, opts, socket);
        const viewFn = config.appRoutes[viewName];
        if (viewFn) {
            rootElem.innerHTML = '';
            rootElem.append(viewFn(context));
        }
    };

    function parseHash() {
        const hash = smartsocket.window.getHash();
        const hashParts = hash.split('-');
        const viewName = hashParts[0];
        return [viewName, {}];
    }

    function currentHashState() {
        const hashParts = smartsocket.window.getHash().split('-');
        return Object.fromQueryString(hashParts.slice(1).join('-'));
    }

    function createContext(elem, opts, socket) {
        // TODO
        // How do we handle changing subscriptions and view transitions?
        //      Could send an unsubscribeFromAll message here because we know the view is changing
        const updateCallbacks = [];

        socket.onEvent = function (key, value) {
            for (var cb of updateCallbacks) {
                cb(key, value);
            }
        };
        return {
            subscribe: function(entity, id, column) {
                // TODO Sends the subscription up the websocket to the server
            },

            onUpdate: function(callback) {
                updateCallbacks.push(callback);
            },

            send: function(key, value) {
                // TODO socket.send
            },
            // TODO getOpts() with Object.freeze(opts)
        }
    }

    // Public functions

    function setHashState(key, value) {
        const newState = currentHashState();
        newState[key] = value;
        smartsocket.window.setHash(`${currentRoute()}-${Object.toQueryString(newState)}`);
    }

    function currentRoute() {
        const [viewName, opts] = parseHash();
        return viewName;
    }

    function getHashState(key) {
        return currentHashState()[key];
    }

    function template(name) {
        // TODO Consider template element
        return $('.templates .' + name).clone();
    }

    return {
        onReady: onReady,
        template: template,
        currentRoute: currentRoute,
        getHashState: getHashState,
        setHashState: setHashState,
    };
})();

smartsocket.window = (function () {
    function getHash() {
        return window.location.hash;
    }

    function setHash(newHash) {
        window.location.hash = newHash
    }

    function onHashChange(callback) {
        window.onhashchange = callback;
    }

    function createWebSocket(url) {
        // TODO replace with ReconnectingWebsocket?
        // TODO Handle websocket disconnect by setting reloadOnClick
        return new WebSocket(url);
    };

    return {
        getHash: getHash,
        setHash: setHash,
        onHashChange: onHashChange
    }
})();
