describe('Example regression tests', () => {
    it('fails', async () => {
        // TODO read events from a file
        const events = [
            "add/users/brady/email:brady@gmail.com",
            "delete/users/brady/email:"
        ];

        // Create an HTML document to host the view, and then use bootlint to check it
        // javascript:(function(){var s=document.createElement("script");s.onload=function(){bootlint.showLintReportForCurrentDocument([]);};s.src="https://stackpath.bootstrapcdn.com/bootlint/latest/bootlint.min.js";document.body.appendChild(s)})();
        const context = smartsocket.testContext();
        const view = entityEditor(context);
        for (var i = 0; i < 10000; i++) { // Not necessary when we have more events
            for (e of events) {
                context.stubSocket.onmessage({data: e});
                expect(view.children.length).toBeLessThan(2);
                expect(view.children.length).toBeGreaterThanOrEqual(0);
            }
        }
    });

    // Check that forms are filled in
    // Check that values are represented in the DOM correctly
    // Check for maximum and minimum lengths of values
    //
    // https://github.com/twbs/bootlint
});
