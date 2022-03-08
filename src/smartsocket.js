"use strict";

const smartsocket = (function () {
    function onReady(rootElem, config) {
        const socket = smartsocket.window.createWebSocket(config.url);
        smartsocket.window.onHashChange(function() {
            showView(rootElem, config, socket);
        });
        showView(rootElem, config, socket);
    }

    function showView(rootElem, config, socket) {
        const [viewName, opts] = parseHash();
        const context = createContext(socket);
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

    function createContext(socket) {
        const updateCallbacks = {
            add: [],
            delete: []
        };
        socket.onmessage = function (e) {
            const event = parseEvent(e.data);
            for (var cb of updateCallbacks[event.type]) {
                cb(event.key, event.value, event.key);
            }
        }

        function parseEvent(eventStr) {
            const [type, key, value] = eventStr.split(":");
            return {type, key, value};
        }

        return {
            subscribe: function(subscription) {
                socket.send("subscribe:" + subscription)
            },

            onAdd: function(callback) {
                updateCallbacks.add.push(callback);
            },

            onDelete: function(callback) {
                updateCallbacks.delete.push(callback);
            },
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

    function testContext() {
        const sentMessages = []; const stubSocket = { sentMessages: sentMessages, send: function (msg) { sentMessages.push(msg) }
        };
        const context = createContext(stubSocket);
        context.stubSocket = stubSocket;
        return context;
    }

    return {
        onReady: onReady,
        currentRoute: currentRoute,
        testContext: testContext,
        // TODO getHashState: getHashState,
        // TODO setHashState: setHashState,
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
        return new WebSocket(url);
    };

    return {
        getHash: getHash,
        setHash: setHash,
        onHashChange: onHashChange
    }
})();

