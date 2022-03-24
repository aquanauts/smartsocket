// Importing the required modules
const WebSocketServer = require('ws');

// Creating a new websocket server
const wss = new WebSocketServer.Server({ port: 8080 })

let state = {};

let serverSocket;
let clientSocket;

// Creating connection using websocket
wss.on("connection", (ws, request) => {
    console.log("new client connected " + request.url);

    if (request.url === '/client') {
        clientSocket = ws;
        // sending message
        ws.on("message", data => {
            msg = JSON.parse(data)
            console.log(`Client has sent us: ${data.toString()}`)
            state = {...state, ...msg};
            if (serverSocket) {
                serverSocket.send(JSON.stringify(state));
            }
        });

        // handling what to do when clients disconnects from server
        ws.on("close", () => {
            console.log("the client has connected");
        });

        // handling client connection error
        ws.onerror = function () {
            console.log("Some Error occurred")
        }
    } else {
        serverSocket = ws;
        serverSocket.send(JSON.stringify(state));
        serverSocket.on("message", data => {
            clientSocket.send(data.toString());
        })
    }
});
console.log("The WebSocket server is running on port 8080");
