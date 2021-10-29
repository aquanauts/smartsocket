"use strict";

const smartsocket = (function () {
    function onReady(rootElem, config) {
        smartsocket.window.onHashChange(function() {
            showView(rootElem, smartsocket.window.getHash(), config);
        });
        showView(rootElem, smartsocket.window.getHash(), config);
    }

    function showView(rootElem, hash, config) {
        const context = createContext(config);
        const hashParts = hash.split('-');
        const viewName = hashParts[0];
        const viewFn = config.appRoutes[viewName];
        if (viewFn) {
            rootElem.innerHTML = '';
            rootElem.append(viewFn(context, hashParts.slice(1)));
        }
    };

    function getViewName() {
        const hashParts = smartsocket.window.getHash().split('-');
        return hashParts[0];
    }

    function currentHashState() {
        const hashParts = smartsocket.window.getHash().split('-');
        return Object.fromQueryString(hashParts.slice(1).join('-'));
    }

    function createContext(elem) {
        // How do we handle changing subscriptions and view transitions?
        return {
            subscribe: function(entity, id, column) {
                // Sends the subscription up the websocket to the server
            },

            onEvent: function(callback) {
                // Calls back when an event is received. function(key, value)
            },

            send: function(key, value) {
            }
        }
    }

    // Public functions

    function setHashState(key, value) {
        const newState = currentHashState();
        newState[key] = value;
        smartsocket.window.setHash(`${getViewName()}-${Object.toQueryString(newState)}`);
    }

    function getHashState(key) {
        return currentHashState()[key];
    }

    function template(name) {
        // Consider template element
        return $('.templates .' + name).clone();
    }

    return {
        onReady: onReady,
        template: template,
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

    return {
        getHash: getHash,
        setHash: setHash,
        onHashChange: onHashChange
    }
})();
