import {createFakeBrowserWindow, Deferred} from '../src/support.js'

describe('synchronous deferred', () => {
    it('resolves synchronously', async () => {
        let actualValue
        const deferred = Deferred.resolve("hello world")
        deferred.then(value => { actualValue = value})
        expect(actualValue).toEqual("hello world");
    });

    it('can chain then() calls', async () => {
        let actualGreeting
        const deferred = new Deferred((resolved, rejected) => {
            resolved("hello")
        }).then((greeting) => greeting + " world")
          .then((greeting) => greeting + "!")
          .then((greeting) => { actualGreeting = greeting })
        expect(actualGreeting).toEqual("hello world!")
    });

    it('handles rejects with catch()', async () => {
        let actualError
        const deferred = new Deferred((resolved, rejected) => {
            rejected("error!")
        }).catch((error) => actualError = error)
        expect(actualError).toEqual('error!')
    });

    it('handles thrown errors with catch()', async () => {
        let actualError
        const deferred = new Deferred((resolved, rejected) => {
            throw "error!"
        }).catch((error) => actualError = error)
        expect(actualError).toEqual('error!')
    });

    it('always calls finally()', async () => {
        const callback = jasmine.createSpy('callback')
        const deferred = new Deferred((resolved, rejected) => {
            throw "error!"
        }).catch((error) => error)
          .finally(callback)
        expect(callback).toHaveBeenCalled()
    });
});

describe('fake browser', () => {
    let windowRef

    beforeEach(() => {
        windowRef = createFakeBrowserWindow()
    })

    it('has a real document with a body', async () => {
        expect(windowRef.document.body).not.toBeUndefined()
    })

    it('handles adding event listeners', async () => {
        const callback = jasmine.createSpy('callback')
        windowRef.addEventListener('myEvent', callback)
        windowRef.dispatchEvent(new Event('myEvent'))
        expect(callback).toHaveBeenCalled()
    })

    it('returns expected responses from fetch', async () => {
        let called = false
        const expectedResponse = {myResponse: true}
        windowRef.setResponse('/myURL', JSON.stringify(expectedResponse))
        await windowRef.fetch('/myURL').then((response) => {
            response.json().then((jsonResponse) => {
                expect(jsonResponse).toEqual(expectedResponse)
                called = true
            })
        })
        expect(called).toBeTrue()
    })

    it('returns an error for unknown fetch URLs', async () => {
        let error
        windowRef.fetch('/unknown').catch((e) => {error = e})
        expect(error).toEqual("No response set for url: /unknown")
    });

    it('can trigger scheduled tasks', async () => {
        const callback = jasmine.createSpy('callback')
        const callback2 = jasmine.createSpy('callback2')
        windowRef.setTimeout(callback, 1000)
        windowRef.setTimeout(callback2, 2000)
        windowRef.timePasses(1500)
        expect(callback).toHaveBeenCalled()
        expect(callback2).not.toHaveBeenCalled()
    })

    it('does not scheduled tasks until the time has elapsed', async () => {
        windowRef.timePasses(500)
        const callback = jasmine.createSpy('callback')
        windowRef.setTimeout(callback, 1000)
        windowRef.timePasses(500)
        expect(callback).not.toHaveBeenCalled()

        windowRef.timePasses(500)
        expect(callback).toHaveBeenCalled()
    })

    it('does not execute old tasks', async () => {
        const callback = jasmine.createSpy('callback')
        windowRef.setTimeout(callback, 1000)
        windowRef.timePasses(1000)
        windowRef.timePasses(1)
        expect(callback.calls.count()).toEqual(1)
    })

    it('can schedule multiple tasks at the same time', async () => {
        const callback = jasmine.createSpy('callback')
        const callback2 = jasmine.createSpy('callback2')
        windowRef.setTimeout(callback, 1000)
        windowRef.setTimeout(callback2, 1000)
        windowRef.timePasses(1500)
        expect(callback).toHaveBeenCalled()
        expect(callback2).toHaveBeenCalled()
    })

    it('can call task on interval time', async () => {
        const callback = jasmine.createSpy('callback')
        windowRef.setInterval(callback, 1000)
        windowRef.timePasses(1000)
        expect(callback.calls.count()).toEqual(1)

        windowRef.timePasses(2000)
        expect(callback.calls.count()).toEqual(2)
    })

    it('can cancel a task', async () => {
        const callback = jasmine.createSpy('callback')
        const id = windowRef.setInterval(callback, 1000)
        windowRef.clearInterval(id)
        windowRef.timePasses(1000)
        expect(callback).not.toHaveBeenCalled()
    });

    describe('stub WebSocket', () => {
        let ws

        beforeEach(() => {
            ws = new windowRef.WebSocket("ws://localhost:1000")
        })
        
        it('records messages sent', function () {
            ws.send("message")
            expect(ws.sentMessages).toEqual(["message"])
        })

        it('can deliver a message to clients', async () => {
            ws.onmessage = jasmine.createSpy('callback')
            ws.deliver('another message')
            expect(ws.onmessage).toHaveBeenCalledWith({data: 'another message'})
        })
    })

})
