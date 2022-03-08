
function entityEditor(context) {
    // Use your web framework of choice to create these views. I'm using Vanilla.js
    const view = document.createElement('div');
    view.className = 'edit-view'
    context.onAdd(function (key, value) {
        const elem = document.createElement('p');
        elem.id = key;
        elem.innerHTML = value;
        view.append(elem);
    });
    context.onDelete(function (key, value) {
        view.querySelector(`#${key}`).remove();
    });
    context.subscribe('users-brady');
    return view;
}

function entityList(context) {
    // Use your web framework of choice to create these views. I'm using Vanilla.js
    const view = document.createElement('ul');
    view.className = 'list-view'
    context.onAdd(function (key, value) {
        const elem = document.createElement('li');
        elem.id = key;
        elem.innerHTML = value;
        view.append(elem);
    });
    context.onDelete(function (key, value) {
        view.querySelector(`#${key}`).remove();
    });
    context.subscribe('users');
    return view;
}

