import {createFakeBrowserWindow, fetchTemplates} from "./support.js"
import {createContext, events} from "../smartsocket.js"
import {initShell, socketView, homeView, jsonView, routes, ADD_TYPE, DELETE_TYPE} from "../app.js"

describe('Example application', () => {
    let templates, context, windowRef

    beforeAll(async () => {
        templates = await fetchTemplates('/base/example/webroot/index.html')
    })

    beforeEach(async () => {
        windowRef = createFakeBrowserWindow()
        windowRef.document.body.append(templates.cloneNode(true))
        context = createContext(windowRef)
    })

    it('has a landing view', async () => {
        const view = homeView(context)
        expect(view.innerHTML).toContain('Smartsocket')
    })

    it('has valid links', async () => {
        templates.content.querySelectorAll('a').forEach((anchor) => {
            expect(Object.keys(routes)).toContain(anchor.getAttribute('href'))
        })
    });

    describe('shell', () => {
        let shell
        beforeEach(() => {
            shell = initShell(context)
            windowRef.location.hash = ''
            windowRef.dispatchEvent(events.viewChange())
        });

        it('select the home view by default', async () => {
            expect(shell.querySelector('.navbar a[href="#home"]')).toHaveClass('selected')
        });

        it('selects the current view in the navbar when it changes', async () => {
            windowRef.location.hash = '#json'
            windowRef.dispatchEvent(events.viewChange())
            expect(shell.querySelector('.navbar a[href="#home"]')).not.toHaveClass('selected')
            expect(shell.querySelector('.navbar a[href="#json"]')).toHaveClass('selected')
        });
    });

    describe('main view', () => {
        let view, socket

        beforeEach(() => {
            view = socketView(context)
            socket = windowRef.sockets[`ws://${windowRef.location.host}/ws`]

            // TODO this is clunky
            socket.onopen()
        })
        
        it('sends an add message when the form is filled', async () => {
            const form = view.querySelector('.AddForm')
            form.querySelector('#keyInput').value = 'foo'
            form.querySelector('#valueInput').value = 'bar'
            form.onsubmit()
            expect(socket.sentMessages).toEqual([JSON.stringify({"type":"a","key":"foo","value":"bar"})])
        })

        it('sends a delete message when the form is filled', async () => {
            const form = view.querySelector('.DeleteForm')
            form.querySelector('#DeleteInput').value = 'foo'
            form.onsubmit()
            expect(socket.sentMessages).toEqual([JSON.stringify({"type":"d","key":"foo"})])
        })

        it('updates the view when a key is added', async () => {
            const tbody = view.querySelector('.StateTable tbody')
            socket.deliver(JSON.stringify({type: ADD_TYPE, key: 'foo', value: 'bar'}))

            const row = tbody.querySelector('tr')
            expect(row.querySelector('td.Key').textContent).toEqual("foo")
            expect(row.querySelector('td.Value').textContent).toEqual("bar")
        })

        it('updates the view when a key is deleted', async () => {
            const tbody = view.querySelector('.StateTable tbody')
            socket.deliver(JSON.stringify({type: ADD_TYPE, key: 'foo', value: 'bar'}))
            socket.deliver(JSON.stringify({type: DELETE_TYPE, key: 'foo'}))
            expect(tbody.querySelector('tr')).toBeNull()
        })
    })

    describe('JSON view', () => {
        let view

        beforeEach(async () => {
            windowRef.setResponse('/state.json', JSON.stringify({
                foo: "bar"
            }))
            view = await jsonView(context)
        });

        it('displays the current state', async () => {
            const tbody = view.querySelector('.StateTable tbody')
            const row = tbody.querySelector('tr')
            expect(row.querySelector('td.Key').textContent).toEqual("foo")
            expect(row.querySelector('td.Value').textContent).toEqual("bar")
        });
    });
})
