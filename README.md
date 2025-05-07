# Live Poll Battle

A real-time polling application that allows users to create or join poll rooms and vote live. Results update instantly across all users in the same room.

## Features

- **User Authentication**: Simple name-based user identification (no password required)
- **Room Management**: Create new poll rooms or join existing ones with a room code
- **Real-time Voting**: Live updates of voting results using WebSockets
- **Vote Persistence**: Local storage to persist votes across page refreshes
- **Countdown Timer**: 60-second timer for each poll room
- **Responsive Design**: Works on both desktop and mobile devices

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io

## Setup Instructions

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn

### Installation

1. Clone this repository
2. Install dependencies for both client and server:

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### Running the Application

#### Start the backend server:

```bash
cd server
npm start
```

This will start the server on port 5000.

#### Start the React frontend:

```bash
cd client
npm start
```

This will start the React development server on port 3000.

Open your browser and navigate to `http://localhost:3000` to use the application.

## How to Use

1. **Create a Poll Room**:
   - Enter your name
   - Click "Create Room"
   - Share the generated room code with others

2. **Join a Poll Room**:
   - Enter your name
   - Select "Join an existing room"
   - Enter the room code
   - Click "Join Room"

3. **Voting**:
   - Once in a room, click on an option to cast your vote
   - Watch as votes update in real-time
   - The poll automatically closes after 60 seconds

## Architecture Overview

### State Management

The application uses a simple state-sharing model based on WebSockets:

- The server maintains an in-memory store of poll rooms with their states
- Clients connect to rooms via WebSockets
- Vote events are broadcast to all clients in the same room
- The server is the source of truth for room state and enforces voting rules

### Room Management

- Rooms are identified by a unique 6-character code
- Each room has a timer that automatically closes voting after 60 seconds
- Rooms are automatically cleaned up when all users leave
- Users are tracked by their socket ID and username within each room 