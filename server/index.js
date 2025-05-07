const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage for poll rooms
const rooms = {};

// Generate a random 6-character room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('New client connected');

  // Create a new poll room
  socket.on('createRoom', ({ username, question }) => {
    const roomCode = generateRoomCode();
    
    rooms[roomCode] = {
      question: question || 'Cats vs Dogs',
      options: ['Cats', 'Dogs'],
      votes: [0, 0],
      users: [{ id: socket.id, username, voted: false }],
      createdAt: Date.now(),
      endTime: Date.now() + 60000, // 60 seconds from now
      active: true
    };

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, room: rooms[roomCode] });
    console.log(`Room created: ${roomCode}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ username, roomCode }) => {
    const room = rooms[roomCode];
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check if there's an existing user with this socket ID (reconnecting)
    const existingUserIndex = room.users.findIndex(user => user.id === socket.id);
    if (existingUserIndex !== -1) {
      // User reconnecting but with different username - update their username
      if (room.users[existingUserIndex].username !== username) {
        // Check if new username already exists
        const isUsernameTaken = room.users.some(user => 
          user.id !== socket.id && user.username === username
        );
        
        if (isUsernameTaken) {
          socket.emit('error', { message: 'Username is already taken in this room' });
          return;
        }
        
        // Update username
        room.users[existingUserIndex].username = username;
        
        // Reset voting status if the username changed
        room.users[existingUserIndex].voted = false;
        room.users[existingUserIndex].votedFor = undefined;
      }
    } else {
      // New user joining - check if username is taken
      const isUsernameTaken = room.users.some(user => user.username === username);
      if (isUsernameTaken) {
        socket.emit('error', { message: 'Username is already taken in this room' });
        return;
      }
      
      // Add user to the room
      room.users.push({ id: socket.id, username, voted: false });
    }
    
    socket.join(roomCode);
    
    // Send room data to the client
    socket.emit('roomJoined', { roomCode, room });
    
    // Notify others that a user has joined
    socket.to(roomCode).emit('userJoined', { 
      username, 
      usersCount: room.users.length 
    });

    console.log(`${username} joined room: ${roomCode}`);
  });

  // Submit a vote
  socket.on('submitVote', ({ roomCode, optionIndex }) => {
    const room = rooms[roomCode];
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (!room.active) {
      socket.emit('error', { message: 'Voting has ended' });
      return;
    }

    // Find the user
    const userIndex = room.users.findIndex(user => user.id === socket.id);
    
    if (userIndex === -1) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

    // Check if user already voted
    if (room.users[userIndex].voted) {
      socket.emit('error', { message: 'You have already voted' });
      return;
    }

    // Debug log before vote
    console.log(`Before vote - Room ${roomCode}: ${JSON.stringify(room.votes)}`);

    // Record the vote
    room.votes[optionIndex]++;
    room.users[userIndex].voted = true;
    room.users[userIndex].votedFor = optionIndex;

    // Calculate total votes
    const totalVotes = room.votes.reduce((sum, vote) => sum + vote, 0);

    // Debug log after vote
    console.log(`After vote - Room ${roomCode}: ${JSON.stringify(room.votes)}, Total: ${totalVotes}`);

    // Send specific vote confirmation to the voter
    socket.emit('voteConfirmed', {
      optionIndex,
      message: `Your vote for ${room.options[optionIndex]} has been recorded`,
      votes: [...room.votes] // Send fresh copy of votes array
    });

    // Broadcast updated results to all users in the room
    io.to(roomCode).emit('voteUpdate', { 
      votes: [...room.votes], // Send a fresh copy to avoid reference issues
      totalVotes: totalVotes,
      votedFor: optionIndex,
      userId: socket.id
    });

    console.log(`Vote submitted in room ${roomCode} for option ${optionIndex}`);
  });

  // Check if voting has ended for each room every second
  const interval = setInterval(() => {
    const now = Date.now();
    
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      
      if (room.active && now >= room.endTime) {
        room.active = false;
        const totalVotes = room.votes.reduce((sum, vote) => sum + vote, 0);
        
        console.log(`Voting ended in room ${roomCode} - Final votes: ${JSON.stringify(room.votes)}, Total: ${totalVotes}`);
        
        io.to(roomCode).emit('votingEnded', { 
          finalVotes: [...room.votes], // Send a fresh copy
          totalVotes: totalVotes
        });
      }
    });
  }, 1000);

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    
    // Remove user from any rooms they were in
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      const userIndex = room.users.findIndex(user => user.id === socket.id);
      
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        
        // If room is empty, remove it
        if (room.users.length === 0) {
          delete rooms[roomCode];
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          // Notify others that a user has left
          socket.to(roomCode).emit('userLeft', { 
            usersCount: room.users.length 
          });
        }
      }
    });
    
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 5000;

// Check if the port is in use, and find an available one if needed
function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(`Port ${PORT} is already in use. Please stop any existing servers or use a different port.`);
    process.exit(1);
  }
}

startServer(); 