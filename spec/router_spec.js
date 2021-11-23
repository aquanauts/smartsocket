"use strict";

describe('Smartsocket', () => {
    var containerElem;
    var currentHash;
    var stubSocket;
    var sentMessages;

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
        smartsocket.onReady(containerElem, {appRoutes: {"#edit": entityEditor, "": entityList}});
    });

    it('shows the default view', async () => {
        expect(containerElem.querySelectorAll('.list-view').length).toEqual(1);
        expect(smartsocket.currentRoute()).toEqual('');
    });

    it('can subscribe to entity updates', async () => {
        expect(sentMessages).toContain('subscribe:users');
    });

    it('routes add events to the view', async () => {
        const event = "add/users/brady:"
        stubSocket.onmessage({data: event});
        const newElem = containerElem.querySelector('.list-view').lastChild;
        expect(newElem.id).toEqual('users-brady');
    });

    it('routes delete events', async () => {
        stubSocket.onmessage({data: "add/users/brady/email:brady@gmail.com"});
        stubSocket.onmessage({data: "delete/users/brady:"});
        expect(containerElem.querySelector('.list-view').children.length).toEqual(0);
    });

    describe('when editing a single entity', () => {
        beforeEach(() => {
            triggerHashChange('#edit');
        });

        it('replaces the view on hash change', async () => {
            triggerHashChange('#alt');
            expect(containerElem.querySelectorAll('.list-view').length).toEqual(0);
            expect(containerElem.querySelectorAll('.edit-view').length).toEqual(1);
        });

        it('can get the current view name', async () => {
            expect(smartsocket.currentRoute()).toEqual('#edit');
        });

        it('allows view to subscribe to changes', async () => {
            expect(sentMessages).toContain('subscribe:users/brady');
        });

        it('routes add events to the view when subscribed', async () => {
            // TODO I'm not sure that slashes are the best delimiter here
            const event = "add/users/brady/email:brady@gmail.com"
            stubSocket.onmessage({data: event});
            const newElem = containerElem.querySelector('.edit-view').lastChild;
            expect(newElem.innerText).toEqual('brady@gmail.com');
            expect(newElem.id).toEqual('users-brady-email');
        });

        it('routes delete events', async () => {
            stubSocket.onmessage({data: "add/users/brady/email:brady@gmail.com"});
            stubSocket.onmessage({data: "delete/users/brady/email:"});
            expect(containerElem.querySelector('.edit-view').children.length).toEqual(0);
        });
    });
});
