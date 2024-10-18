const http = require("http");
const express = require("express");
const cors = require("cors");
const socketIO = require("socket.io");

const app = express();
const port = process.env.PORT || 4500; // Default to port 4500 if not set

// Users object to store socket.id -> user mappings
const users = {};

app.use(cors({
    origin: "*", // In production, replace '*' with your frontend domain
    methods: ["GET", "POST"]
}));

app.get("/", (req, res) => {
    res.send("HELLO, ITS WORKING!");
});

const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: "*", // Again, replace '*' with your actual domain in production
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("New Connection");

    // When a user joins
    socket.on('joined', ({ user }) => {
        users[socket.id] = user; // Store user by socket ID
        console.log(`${user} has joined`);

        // Notify all other users that someone has joined
        socket.broadcast.emit('userJoined', { user: "Admin", message: `${users[socket.id]} has joined` });

        // Welcome the current user
        socket.emit('welcome', { user: "Admin", message: `Welcome to the chat, ${users[socket.id]}!` });
    });

    // When a message is sent
    socket.on('message', ({ message, id }) => {
        if (!users[id]) {
            console.error(`User with id ${id} not found.`);
            return;
        }
        io.emit('sendMessage', { user: users[id], message, id }); // Broadcast message to all clients
    });

    // When a user disconnects
    socket.on('disconnect', () => {
        if (users[socket.id]) {
            socket.broadcast.emit('leave', { user: "Admin", message: `${users[socket.id]} has left` });
            console.log(`${users[socket.id]} has left`);

            // Remove the user from the list
            delete users[socket.id];
        }
    });
});

// Gracefully shut down the server
process.on('SIGINT', () => {
    console.log("Shutting down...");
    io.close(); // Close all socket connections
    server.close(); // Stop the HTTP server
    process.exit();
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
