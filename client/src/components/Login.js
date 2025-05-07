import React, { useState } from 'react';

function Login({ username, setUsername, onCreateRoom, onJoinRoom, onLogout }) {
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isJoining) {
      onJoinRoom(joinRoomCode);
    } else {
      onCreateRoom();
    }
  };

  return (
    <div className="login-container">
      <h2>{isJoining ? 'Join Poll Room' : 'Create New Poll Room'}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Enter Your Name:</label>
          <div className="username-input-container">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              required
            />
            {username && (
              <button 
                type="button" 
                className="reset-button"
                onClick={onLogout}
                title="Reset username"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {isJoining && (
          <div className="form-group">
            <label htmlFor="roomCode">Room Code:</label>
            <input
              type="text"
              id="roomCode"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              required
            />
          </div>
        )}
        
        <div className="button-group">
          <button type="submit" className="primary-button">
            {isJoining ? 'Join Room' : 'Create Room'}
          </button>
          
          <button 
            type="button" 
            className="secondary-button"
            onClick={() => setIsJoining(!isJoining)}
          >
            {isJoining ? 'Create a new room instead' : 'Join an existing room instead'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login; 