// Importing the required modules
const WebSocketServer = require('ws');

// Creating a new websocket server
const wss = new WebSocketServer.Server({ port: 8080 })

const state = {};

let serverSocket;

// Creating connection using websocket
wss.on("connection", (ws, request) => {
    console.log("new client connected " + request.url);

    if (request.url === '/client') {
        // sending message
        ws.on("message", data => {
            const [key, value] = data.toString().split(":", 2)
            console.log(`Client has sent us: ${key} : ${value}`)
            state[key] = value;
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
        ws.send(JSON.stringify(state));
        serverSocket = ws;
    }
});
console.log("The WebSocket server is running on port 8080");
