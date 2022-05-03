export default function(params) {
    const {name, group} = params;
    let view = template('profileView');
    view.find('.name').text(name);
    view.find('.group').text(group);
    return view;
}
