"use strict";

describe('Router', () => {
    var containerElem;
    var currentHash;

    function mainView(context) {
        const view = document.createElement('div');
        view.className = 'main-view'
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
        currentHash = '';
        containerElem = document.createElement('div');
        containerElem.id = "container";
        smartsocket.window = {
            onHashChange: jasmine.createSpy('onHashChange'),
            getHash: function () { return currentHash }
        };
        smartsocket.onReady(containerElem, {appRoutes: {"": mainView, "#alt": altView}});
    });

    it('shows the default view', async () => {
        expect(containerElem.querySelectorAll('.main-view').length).toEqual(1);
    });

    it('replaces the view on hash change', async () => {
        triggerHashChange('#alt');
        expect(containerElem.querySelectorAll('.alt-view').length).toEqual(1);
        expect(containerElem.querySelectorAll('.main-view').length).toEqual(0);
    });
});
