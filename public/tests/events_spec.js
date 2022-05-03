describe('events', () => {
    let elem;

    beforeEach(() => {
        elem = $('<div>');
        $('.view-container').append(elem);
    });

    afterEach(() => {
        $('.view-container').empty();
    });

    it('can publish an event to the current view', async () => {
        let cb = jasmine.createSpy();
        let received = false;
        subscribeEvent(elem, 'foo', cb);
        triggerEvent('foo', 'arg1', 'arg2');
        expect(cb).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('can subcribe to events with a promise', async () => {
        let cb = jasmine.createSpy();
        subscribeEvent(elem, 'foo').then(cb);
        triggerEvent('foo', 'arg1', 'arg2');
        expect(cb).toHaveBeenCalledWith('arg1', 'arg2');
    });
});
