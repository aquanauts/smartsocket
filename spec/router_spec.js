"use strict";

describe('Router', () => {
    var containerElem;
    var currentHash;
    var stubSocket;

    function testView(context) {
        const view = document.createElement('div');
        view.className = 'main-view'
        context.subscribe('users');
        context.onUpdate(function (key, value) {
            const elem = document.createElement('p');
            elem.innerHTML = value;
            view.after(elem);
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
        stubSocket = {};
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

    it('routes events to the view when subscribed', async () => {
        const event = "a/users/brady/email:brady@gmail.com"
        stubSocket.onmessage({data: event});
        expect(containerElem.querySelectorAll('p')[0].innerText).toEqual('brady@gmail.com');
    });

});
