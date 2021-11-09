"use strict";

describe('Smartsocket', () => {
    var containerElem;
    var currentHash;
    var stubSocket;
    var sentMessages;

    function testView(context) {
        const view = document.createElement('div');
        view.className = 'main-view'
        context.subscribe('users/brady');
        context.onAdd(function (entity, id, attribute, value) {
            const elem = document.createElement('p');
            elem.id = `${entity}-${id}-${attribute}`
            elem.innerHTML = value;
            view.append(elem);
        });
        context.onDelete(function (entity, id, attribute) {
            view.querySelector(`#${entity}-${id}-${attribute}`).remove();
        });
        return view;
    }

    function altView(context) {
        const view = document.createElement('div');
        view.className = 'alt-view'
        return view;
    }

    function triggerHashChange(newHash) {
        currentHash = newHash;
        smartsocket.window.onHashChange.calls.mostRecent().args[0]();
    }

    beforeEach(() => {
        sentMessages = [];
        stubSocket = {
            send: function (msg) { sentMessages.push(msg) }
        };
        currentHash = '';
        containerElem = document.createElement('div');
        containerElem.id = "container";
        smartsocket.window = {
            onHashChange: jasmine.createSpy('onHashChange'),
            getHash: function () { return currentHash },
            createWebSocket: function () { return stubSocket }
        };
        smartsocket.onReady(containerElem, {appRoutes: {"": testView, "#alt": altView}});
    });

    it('shows the default view', async () => {
        expect(containerElem.querySelectorAll('.main-view').length).toEqual(1);
    });

    it('replaces the view on hash change', async () => {
        triggerHashChange('#alt');
        expect(containerElem.querySelectorAll('.alt-view').length).toEqual(1);
        expect(containerElem.querySelectorAll('.main-view').length).toEqual(0);
    });

    it('can get the current view name', async () => {
        expect(smartsocket.currentRoute()).toEqual('');
        triggerHashChange('#alt');
        expect(smartsocket.currentRoute()).toEqual('#alt');
    });

    it('allows view to subscribe to changes', async () => {
        expect(sentMessages).toContain('subscribe:users/brady');
    });

    it('routes add events to the view when subscribed', async () => {
        // TODO I'm not sure that slashes are the best delimiter here
        const event = "add/users/brady/email:brady@gmail.com"
        stubSocket.onmessage({data: event});
        const newElem = containerElem.querySelector('.main-view').lastChild;
        expect(newElem.innerText).toEqual('brady@gmail.com');
        expect(newElem.id).toEqual('users-brady-email');
    });

    it('routes delete events', async () => {
        stubSocket.onmessage({data: "add/users/brady/email:brady@gmail.com"});
        stubSocket.onmessage({data: "delete/users/brady/email:"});
        expect(containerElem.querySelector('.main-view').children.length).toEqual(0);
    });
});
