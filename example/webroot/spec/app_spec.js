import {createFakeBrowserWindow, fetchTemplates} from "./support.js"
import {createContext} from "../smartsocket.js"
import {mainView, aboutView, ADD_TYPE, DELETE_TYPE} from "../app.js"

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

    it('has an about view', async () => {
        const view = aboutView(context)
        expect(view.innerHTML).toContain('About')
    })

    describe('main view', () => {
        let view, socket

        beforeEach(() => {
            view = mainView(context)
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
})
