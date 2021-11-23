
function entityEditor(context) {
    // Use your web framework of choice to create these views. I'm using Vanilla.js
    const view = document.createElement('div');
    view.className = 'edit-view'
    context.onAdd(function (value, entity, id, attribute) {
        const elem = document.createElement('p');
        elem.id = `${entity}-${id}-${attribute}`
        elem.innerHTML = value;
        view.append(elem);
    });
    context.onDelete(function (value, entity, id, attribute) {
        view.querySelector(`#${entity}-${id}-${attribute}`).remove();
    });
    context.subscribe('users/brady');
    return view;
}

function entityList(context) {
    // Use your web framework of choice to create these views. I'm using Vanilla.js
    const view = document.createElement('ul');
    view.className = 'list-view'
    context.onAdd(function (value, entity, id, attribute) {
        const elem = document.createElement('li');
        elem.id = `${entity}-${id}`
        elem.innerHTML = value;
        view.append(elem);
    });
    context.onDelete(function (value, entity, id, attribute) {
        view.querySelector(`#${entity}-${id}`).remove();
    });
    context.subscribe('users');
    return view;
}

