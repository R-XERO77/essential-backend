// EaglerForge Essential Clone - Step 3: Backend WebSocket Server (Render Fix)
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// 1. Create a basic HTTP server so Render's health checks get a 200 OK response
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Essential Backend is Online and routing WebSockets!');
});

// 2. Attach our WebSocket server to that HTTP server
const wss = new WebSocket.Server({ server });

// Track connected players: Key = Username, Value = WebSocket Connection
const connectedPlayers = new Map();

console.log(`[Essential Server] Starting on port ${PORT}...`);

wss.on('connection', function connection(ws) {
    let currentUsername = null;

    console.log("[Essential Server] A client connected. Waiting for authentication...");

    // Listen for messages from the Eaglercraft frontend client
    ws.on('message', function message(data) {
        try {
            const packet = JSON.parse(data);

            // Handle type 1: Player logs in and registers their username
            if (packet.type === "login") {
                currentUsername = packet.username;
                connectedPlayers.set(currentUsername, ws);
                console.log(`[Essential Server] Player "${currentUsername}" is now online.`);
                
                broadcast({ type: "player_online", username: currentUsername });
            }

            // Handle type 2: Player sends a WebRTC world invite code to a specific friend
            if (packet.type === "send_invite") {
                const targetFriend = packet.target;
                if (connectedPlayers.has(targetFriend)) {
                    const friendSocket = connectedPlayers.get(targetFriend);
                    
                    friendSocket.send(JSON.stringify({
                        type: "receive_invite",
                        sender: currentUsername,
                        code: packet.code
                    }));
                    console.log(`[Essential Server] Routed invite from ${currentUsername} to ${targetFriend}`);
                } else {
                    ws.send(JSON.stringify({ type: "error", message: `Friend ${targetFriend} is offline.` }));
                }
            }

        } catch (e) {
            console.error("[Essential Server] Error processing message:", e);
        }
    });

    // Handle user disconnecting
    ws.on('close', function() {
        if (currentUsername) {
            connectedPlayers.delete(currentUsername);
            console.log(`[Essential Server] Player "${currentUsername}" went offline.`);
            broadcast({ type: "player_offline", username: currentUsername });
        }
    });
});

// Helper function to send updates to every connected user
function broadcast(dataObj) {
    const messageString = JSON.stringify(dataObj);
    connectedPlayers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// 3. Tell the HTTP server to start listening
server.listen(PORT, () => {
    console.log(`[Essential Server] HTTP and WebSocket listening on port ${PORT}`);
});
