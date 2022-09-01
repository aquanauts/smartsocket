export const ADD_TYPE = "a"
export const DELETE_TYPE = "d"

export function aboutView(context) {
    return context.template('AboutView')
}

export function mainView(context, viewParams) {
    function addKey(key, value) {
        let row = rows[key]
        if (!row) {
            row = context.template('StateRow')
            row.id = key
            tbody.append(row)
            rows[key] = row
        }
        row.querySelector('.Key').textContent = key
        row.querySelector('.Value').textContent = value
    }

    function deleteKey(key) {
        tbody.querySelector('#' + key).remove()
        delete rows[key]
    }

    function memoizer(memo, message) {
        if (message.type === ADD_TYPE) {
            memo[message.key] = message.value
            addKey(message.key, message.value)
        }
        if (message.type === DELETE_TYPE) {
            delete memo[message.key]
            deleteKey(message.key)
        }
    }

    const rows = {}
    const view = context.template('MainView')
    const tbody = view.querySelector('.StateTable tbody')
    const socket = context.connect('ws', {memoizer})

    const addForm = view.querySelector('.AddForm')
    addForm.onsubmit = function () {
        const keyElem = addForm.querySelector('#keyInput')
        const valueElem = addForm.querySelector('#valueInput')
        socket.sendJSON({type:"a", key: keyElem.value, value: valueElem.value})
        keyElem.value = ""
        valueElem.value = ""
        keyElem.focus()
        return false
    }

    const deleteForm = view.querySelector('.DeleteForm')
    deleteForm.onsubmit = function () {
        const deleteElem = deleteForm.querySelector('#DeleteInput')
        socket.sendJSON({type:"d", key: deleteElem.value})
        deleteElem.value = ""
        deleteElem.focus()
        return false
    }
    return view
}

// TODO getJSON example
// TODO Timer example
// TODO Interval / nowMillis clock example
// TODO Event listener example (navbar)

export const routes = {
    "": mainView,
    "#": mainView,
    "#main": mainView,
    "#about": aboutView
}
