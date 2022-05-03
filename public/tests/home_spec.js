import homeView from '../js/views/home.js';

describe('Home View', function () {
    it('Shows the title', function () {
        let view = homeView();
        expect(view.find('.title').text()).toEqual("The Aquatic Webapp Theme");
    });
});
