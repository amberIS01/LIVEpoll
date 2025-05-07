import React, { useState, useEffect, useCallback } from 'react';

function PollRoom({ room, roomCode, username, votedOption, onVote, onLogout }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showEndingAlert, setShowEndingAlert] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Handle closing the alert - defined as a regular function
  function handleCloseAlert() {
    console.log("Closing alert - button clicked");
    setShowEndingAlert(false);
  }
  
  // Handle closing the results modal - defined as a regular function
  function handleCloseResults() {
    console.log("Closing results - button clicked");
    setShowResults(false);
  }
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate time remaining
  useEffect(() => {
    if (!room) return;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, room.endTime - now);
      const seconds = Math.ceil(remaining / 1000);
      setTimeLeft(seconds);
      
      // Show ending alert when 5 seconds or less remain
      if (seconds <= 5 && seconds > 0 && !showEndingAlert) {
        setShowEndingAlert(true);
      }
      
      // Show final results when time is up
      if (seconds === 0 && !showResults && !room.active) {
        setShowResults(true);
      }
    };
    
    // Call once immediately
    updateTimer();
    
    // Update every second
    const timerId = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timerId);
  }, [room, showEndingAlert, showResults]);
  
  // Calculate percentages for the poll display - debug version with console logs
  const calculatePercentage = (index) => {
    if (!room || !room.votes) return 0;
    
    // Get total votes by summing all votes
    const totalVotes = room.votes.reduce((sum, current) => sum + current, 0);
    if (totalVotes === 0) return 0;
    
    // Calculate percentage
    const percentage = Math.round((room.votes[index] / totalVotes) * 100);
    
    // Debug info
    console.log(`Option ${index}: ${room.votes[index]} / ${totalVotes} = ${percentage}%`);
    
    return percentage;
  };
  
  // Get winning option
  const getWinner = () => {
    if (!room || !room.votes) return null;
    
    const maxVotes = Math.max(...room.votes);
    
    // If no votes or a tie
    if (maxVotes === 0) return { text: "No votes were cast", isTie: false };
    
    const winningIndices = room.votes
      .map((vote, index) => ({ vote, index }))
      .filter(item => item.vote === maxVotes)
      .map(item => item.index);
    
    if (winningIndices.length > 1) {
      return { 
        text: "It's a tie!", 
        options: winningIndices.map(i => room.options[i]),
        isTie: true,
        votes: maxVotes
      };
    }
    
    return { 
      text: `${room.options[winningIndices[0]]} won!`, 
      option: room.options[winningIndices[0]],
      isTie: false,
      votes: maxVotes
    };
  };
  
  if (!room) return <div>Loading...</div>;
  
  return (
    <div className="poll-room">
      {/* Poll ending alert */}
      {showEndingAlert && timeLeft > 0 && (
        <div className="poll-ending-alert-overlay">
          <div className="poll-ending-alert">
            <div className="alert-icon">⏱️</div>
            <h3>Poll Ending Soon!</h3>
            <p>Only <span className="highlight">{timeLeft}</span> seconds remaining to vote!</p>
            <button 
              type="button" 
              className="close-alert-btn" 
              onClick={handleCloseAlert}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Results modal */}
      {showResults && !room.active && (
        <div 
          className="results-modal-overlay" 
          onClick={handleCloseResults}
        >
          <div 
            className="results-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={handleCloseResults}
            >
              ×
            </button>
            <h2>Poll Results</h2>
            <div className="final-question">{room.question}</div>
            
            {(() => {
              const winner = getWinner();
              return (
                <div className="winner-section">
                  <h3>{winner.text}</h3>
                  {winner.isTie ? (
                    <div className="tie-result">
                      <div className="tie-options">
                        {winner.options.map((option, index) => (
                          <div key={index} className="tie-option">{option}</div>
                        ))}
                      </div>
                      <div className="tie-votes">Tied with {winner.votes} votes each</div>
                    </div>
                  ) : winner.option ? (
                    <div className="winner-result">
                      <div className="winner-crown">👑</div>
                      <div className="winner-option">{winner.option}</div>
                      <div className="winner-votes">With {winner.votes} votes</div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
            
            <div className="final-votes">
              <h4>Final Vote Breakdown</h4>
              <div className="final-options">
                {room.options.map((option, index) => {
                  const percentage = calculatePercentage(index);
                  return (
                    <div key={index} className="final-option">
                      <div className="option-name">{option}</div>
                      <div className="option-result">
                        <div 
                          className="result-bar"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="result-text">
                          {room.votes[index]} votes ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button 
              type="button" 
              className="close-results-btn" 
              onClick={() => {
                console.log("Explicit close button clicked");
                setShowResults(false);
              }}
            >
              Close Results
            </button>
          </div>
        </div>
      )}
      
      <div className="room-info">
        <h2>{room.question}</h2>
        <p className="room-code">Room Code: <span>{roomCode}</span></p>
        <p className="user-info">
          Logged in as: <span>{username}</span>
          <button 
            className="change-user-button" 
            onClick={onLogout}
            title="Change username"
            type="button"
          >
            Change
          </button>
        </p>
        <p className="time-left">
          Time Remaining: <span className={timeLeft < 10 ? 'warning' : ''}>
            {formatTime(timeLeft)}
          </span>
        </p>
      </div>
      
      <div className="voting-section">
        {room.options.map((option, index) => {
          // Use the fixed percentage calculation function
          const percentage = calculatePercentage(index);
          const isSelected = votedOption === index;
          
          return (
            <div 
              key={index} 
              className={`option-container ${isSelected ? 'selected' : ''} ${!room.active ? 'disabled' : ''}`}
              onClick={() => {
                // Only allow voting if the room is active and user hasn't voted yet
                if (room.active && votedOption === null) {
                  onVote(index);
                }
              }}
            >
              <div className="option-text">{option}</div>
              
              <div className="vote-bar-container">
                <div 
                  className="vote-bar" 
                  style={{ width: `${percentage}%` }}
                ></div>
                <span className="vote-percentage">{percentage}%</span>
              </div>
              
              <div className="vote-count">
                {room.votes[index]} {room.votes[index] === 1 ? 'vote' : 'votes'}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="voting-status">
        {!room.active ? (
          <div>
            <p className="voting-ended">Voting has ended!</p>
            <button 
              className="view-results-btn" 
              onClick={() => setShowResults(true)}
              type="button"
            >
              View Final Results
            </button>
          </div>
        ) : votedOption !== null ? (
          <p className="already-voted">
            You voted for <strong>{room.options[votedOption]}</strong>
          </p>
        ) : (
          <p className="vote-prompt">Select an option to vote</p>
        )}
      </div>
    </div>
  );
}

export default PollRoom; 