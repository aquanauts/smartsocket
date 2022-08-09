const http = require( 'http');
const url = require('url');
const WebSocketServer = require('ws');
const fs = require('fs');
const path = require('path');

let state = {};

const server = http.createServer(function (request, response) {
    let filePath = '.' + request.url;
    if (filePath === './')
        filePath = './index.html';

    let extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            filePath = filePath.replace("./", "../src/");
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.html':
            contentType = 'text/html';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code === 'ENOENT') {
                response.writeHead(400, { 'Content-Type': contentType });
                response.end('File not found at ' + filePath + "\n");
                response.end(content, 'utf-8');
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
});
const wss = new WebSocketServer.Server({ noServer: true, clientTracking: true });

// Creating connection using websocket
wss.on("connection", (ws, request) => {
    console.log("Client connected from " + request.socket.remoteAddress);

    // Update state and broadcast message to all clients
    ws.on("message", data => {
        console.log(`Client from ${request.socket.remoteAddress} has sent us: ${data.toString()}`)
        let msg = JSON.parse(data)
        if (msg.type === "a") {
            state[msg.key] = msg.value
        }
        if (msg.type === "d") {
            delete state[msg.key]
        }
        for(let client of wss.clients) {
            client.send(data.toString());
        }
    });

    // Only log when clients connections close
    ws.on("close", () => {
        console.log(`Client closed ${request.socket.remoteAddress}`);
    });

    // Disconnect client on error
    ws.onerror = function () {
        console.log(`Error occurred. Closing client ${request.socket.remoteAddress}`)
        ws.close();
    }

    // Send full snapshot to new client
    for ([key, value] of Object.entries(state)) {
        ws.send(JSON.stringify({type: "a", key, value}))
    }
});

server.on('upgrade', function upgrade(request, socket, head) {
    const { pathname } = url.parse(request.url);

    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(8080);

console.log("Server is running. Open http://localhost:8080");
