export const ADD_TYPE = "a"
export const DELETE_TYPE = "d"

export function initShell(context) {
    const shell = context.template('shell')
    const navbar = shell.querySelector('.navbar')
    context.addEventListener('smartsocket.viewChange', (e) => {
        navbar.querySelector('a.selected').classList.remove('selected');
        navbar.querySelector(`a[href="${context.currentView() || '#home'}"]`).classList.add('selected')
    })
    return shell
}

export function homeView(context) {
    return context.template('HomeView')
}

export function socketView(context) {
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
    const table = context.template('StateTable')
    const tbody = table.querySelector('tbody')
    const socket = context.connect('ws', {memoizer})

    view.querySelector('.TableContainer').append(table)

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

export async function jsonView(context, viewParams) {
    function updateState(newState) {
        const container = view.querySelector('.TableContainer')
        const table = context.template('StateTable')
        const tbody = table.querySelector('tbody');
        for(let [key, value] of Object.entries(newState)) {
            const row = context.template('StateRow')
            row.querySelector('.Key').textContent = key
            row.querySelector('.Value').textContent = value
            tbody.append(row)
        }
        container.innerHTML = ''
        container.append(table)
    }

    const view = context.template('JsonView')
    const state = await context.getJSON('/state.json')
    updateState(state)
    // TODO UI element to set this value
    if (viewParams.refreshInterval) {
        // TODO Need to cancel the interval automatically when the view changes
        context.setInterval(() => {  
            context.getJSON('/state.json', {}, updateState)
        }, 1000)
    }
    return view
}

export const routes = {
    "": homeView,
    "#": homeView,
    "#home": homeView,
    "#socket": socketView,
    "#json": jsonView,
}
