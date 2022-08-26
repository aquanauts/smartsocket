import {createFakeBrowserWindow} from "../support.js"
import {createContext} from "../smartsocket.js"
import {mainView} from "../app.js"

describe('Example application', () => {
    let templates, context, windowRef, markup;

    beforeAll(async () => {
        const response = await fetch('/base/example/webroot/index.html')
        markup = await response.text()
        const doc = new DOMParser().parseFromString(markup, 'text/html')
        templates = doc.querySelector('template')
    });

    beforeEach(() => {
        windowRef = createFakeBrowserWindow()
        const templateContainer = windowRef.document.body.append(templates.cloneNode(true))
        context = createContext(windowRef)
    });

    describe('main view', () => {
        let view, socket;

        beforeEach(() => {
            view = mainView(context);
            socket = windowRef.sockets[`ws://${windowRef.location.host}/ws`]

            // TODO this is clunky
            socket.onopen();
        });
        
        it('sends an add message when the form is filled', async () => {
            const form = view.querySelector('.AddForm')
            form.querySelector('#keyInput').value = 'foo'
            form.querySelector('#valueInput').value = 'bar'
            form.onsubmit()
            expect(socket.sentMessages).toEqual([JSON.stringify({"type":"a","key":"foo","value":"bar"})])
        });

        it('sends a delete message when the form is filled', async () => {
            const form = view.querySelector('.DeleteForm')
            form.querySelector('#DeleteInput').value = 'foo'
            form.onsubmit()
            expect(socket.sentMessages).toEqual([JSON.stringify({"type":"d","key":"foo"})])
        });
    });
});
