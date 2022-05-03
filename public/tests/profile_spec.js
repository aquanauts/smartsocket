import profileView from '../js/views/profile.js';

describe('Profile view', () => {
    it('has a name and group', async () => {
        const view = profileView({name: "Alice", group: "engineering"});
        expect(view.find('.name').text()).toEqual("Alice");
        expect(view.find('.group').text()).toEqual("engineering");
    });
});
