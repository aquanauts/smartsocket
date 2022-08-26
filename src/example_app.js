export function mainView(context, viewParams) {
    const view = context.template('MainView')
    const tbody = view.querySelector('tbody');
    const socket = context.connect('ws');

    socket.onAdd((key, value) => {
        let row = tbody.querySelector('#' + msg.key);
        if (row === null) {
            row = document.createElement('tr');
            row.id = msg.key
            row.append(document.createElement('td'));
            row.append(document.createElement('td'));
            tbody.append(row);
        }
        row.childNodes[0].innerText = msg.key;
        row.childNodes[1].innerText = msg.value;
    })

    socket.onDelete((key) => {
        tbody.querySelector('#' + key).remove();
    })

    const addForm = view.querySelector('.AddForm')
    addForm.onsubmit = function () {
        const keyElem = addForm.querySelector('#keyInput')
        const valueElem = addForm.querySelector('#valueInput')
        // TODO Send an object here, not a string
        socket.send(JSON.stringify({type:"a", key: keyElem.value, value: valueElem.value}));
        keyElem.value = ""
        valueElem.value = ""
        keyElem.focus()
        return false
    }

    const deleteForm = view.querySelector('.DeleteForm')
    deleteForm.onsubmit = function () {
        const deleteElem = deleteForm.querySelector('#DeleteInput')
        // TODO Send an object here, not a string
        socket.send(JSON.stringify({type:"d", key: deleteElem.value}));
        deleteElem.value = ""
        deleteElem.focus()
        return false;
    }
    return view;
}

export const routes = {
    "": mainView,
    "#": mainView,
    "#main": mainView
};
