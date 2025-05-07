import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Components
import Login from './components/Login';
import PollRoom from './components/PollRoom';

// Initialize socket instance
const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [votedOption, setVotedOption] = useState(null);

  // Check localStorage for existing session
  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('pollSession'));
    
    // Only restore session if the username matches
    if (storedData && storedData.username === username && username !== '') {
      setRoomCode(storedData.roomCode);
      setVotedOption(storedData.votedOption);
      
      // If we have stored data, attempt to rejoin the room
      if (storedData.roomCode) {
        socket.emit('joinRoom', { 
          username: storedData.username, 
          roomCode: storedData.roomCode 
        });
      }
    } else if (username === '' && storedData) {
      // New login, clear stored voting data
      const cleanSession = {
        ...storedData,
        votedOption: null
      };
      localStorage.setItem('pollSession', JSON.stringify(cleanSession));
    } else if (username !== '' && (!storedData || storedData.username !== username)) {
      // Username changed, reset everything
      localStorage.removeItem('pollSession');
      setRoomCode('');
      setRoom(null);
      setVotedOption(null);
    }
    
    // Socket connection events
    socket.on('connect', () => {
      // We can log the connection but no need to store it
      console.log('Connected to server');
    });

    socket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    socket.on('roomCreated', (data) => {
      console.log('Room created:', data);
      setRoomCode(data.roomCode);
      
      // Make a clean copy of the room data
      const roomData = JSON.parse(JSON.stringify(data.room));
      setRoom(roomData);
      
      // Save to localStorage
      localStorage.setItem('pollSession', JSON.stringify({
        username,
        roomCode: data.roomCode
      }));
    });

    socket.on('roomJoined', (data) => {
      console.log('Room joined:', data);
      setRoomCode(data.roomCode);
      
      // Make a clean copy of the room data
      const roomData = JSON.parse(JSON.stringify(data.room));
      setRoom(roomData);
      
      // Check if this user has already voted in this room
      const currentUser = roomData.users.find(user => user.username === username);
      if (currentUser && currentUser.voted) {
        console.log('User already voted:', currentUser);
        setVotedOption(currentUser.votedFor);
      } else {
        // Make sure votedOption is reset when joining a room with new username
        console.log('New user or hasn\'t voted yet');
        setVotedOption(null);
      }
      
      // Save to localStorage
      localStorage.setItem('pollSession', JSON.stringify({
        username,
        roomCode: data.roomCode,
        votedOption: currentUser?.voted ? currentUser.votedFor : null
      }));
    });

    socket.on('voteUpdate', (data) => {
      console.log('Vote update received:', data);
      setRoom(prevRoom => {
        if (!prevRoom) return null;
        
        // Create a deep copy of the previous room
        const updatedRoom = JSON.parse(JSON.stringify(prevRoom));
        
        // Update votes
        updatedRoom.votes = data.votes;
        updatedRoom.totalVotes = data.totalVotes;
        
        // If this is the current user's vote, update votedOption
        if (data.userId === socket.id) {
          setVotedOption(data.votedFor);
          
          // Update localStorage
          const storedData = JSON.parse(localStorage.getItem('pollSession')) || {};
          localStorage.setItem('pollSession', JSON.stringify({
            ...storedData,
            votedOption: data.votedFor
          }));
        }
        
        // Log the updated room for debugging
        console.log('Updated room state:', updatedRoom);
        
        return updatedRoom;
      });
    });

    socket.on('votingEnded', (data) => {
      setRoom(prevRoom => {
        if (!prevRoom) return null;
        
        return {
          ...prevRoom,
          votes: data.finalVotes,
          totalVotes: data.totalVotes,
          active: false
        };
      });
    });

    // Specific vote confirmation for the current user
    socket.on('voteConfirmed', (data) => {
      setVotedOption(data.optionIndex);
      
      // Update localStorage
      const storedData = JSON.parse(localStorage.getItem('pollSession')) || {};
      localStorage.setItem('pollSession', JSON.stringify({
        ...storedData,
        votedOption: data.optionIndex
      }));
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('error');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('voteUpdate');
      socket.off('votingEnded');
      socket.off('voteConfirmed');
    };
  }, [username]);

  // Handle creating a new room
  const handleCreateRoom = () => {
    if (!username) {
      setError('Please enter your username');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    socket.emit('createRoom', { 
      username, 
      question: 'Cats vs Dogs' 
    });
  };

  // Handle joining an existing room
  const handleJoinRoom = (joinRoomCode) => {
    if (!username) {
      setError('Please enter your username');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!joinRoomCode) {
      setError('Please enter a room code');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    socket.emit('joinRoom', { 
      username, 
      roomCode: joinRoomCode 
    });
  };

  // Handle submitting a vote
  const handleVote = (optionIndex) => {
    if (votedOption !== null) {
      setError('You have already voted');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    socket.emit('submitVote', { 
      roomCode, 
      optionIndex 
    });
  };

  // Handle logout/reset session
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('pollSession');
    
    // Reset state
    setUsername('');
    setRoomCode('');
    setRoom(null);
    setVotedOption(null);
    
    // If in a room, leave it without using socket.emit('disconnect')
    // The disconnect event is handled automatically by Socket.io
    // We're just clearing our local state
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Poll Battle</h1>
        {error && <div className="error-message">{error}</div>}
        {room && (
          <button 
            onClick={handleLogout} 
            className="logout-button"
          >
            Logout
          </button>
        )}
      </header>
      
      <main>
        {!room ? (
          <Login
            username={username}
            setUsername={setUsername}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLogout={handleLogout}
          />
        ) : (
          <PollRoom
            room={room}
            roomCode={roomCode}
            username={username}
            votedOption={votedOption}
            onVote={handleVote}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}

export default App;
