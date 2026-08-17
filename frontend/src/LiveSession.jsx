import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client"; // Import Socket.io client for real-time communication
import "./LiveSession.css";

// Define the server URL (update if different)
const SOCKET_SERVER_URL =
  import.meta.env.MODE === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";
    
const LiveSession = ({ isHost, availableSessions = [], onSessionStart, onSessionEnd }) => {
  console.log("LiveSession mounted");

  // Local state for host's stream status and error handling
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState("");

  // Local state for viewer sessions (if not provided via props)
  const [sessions, setSessions] = useState(availableSessions);

  // Refs for the video element and media stream
  const currentStream = useRef(null);
  const videoRef = useRef(null);
  // Ref for Socket.io connection to persist through renders
  const socketRef = useRef(null);

  // Initialize Socket.io connection on mount
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);
    console.log("Socket connected:", socketRef.current.id);

    // For viewers: listen for session updates from the server
    socketRef.current.on("sessionUpdate", (newSessions) => {
      setSessions(newSessions);
      console.log("Session update received:", newSessions);
    });

    // Clean up the socket connection on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      endStream(); // End any active stream when component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to start streaming (either screen share or camera)
  const startStream = async (isScreen) => {
    try {
      let stream;
      if (isScreen) {
        // If sharing screen, get display media and mix in audio from microphone
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach((track) => {
          stream.addTrack(track);
        });
      } else {
        // Otherwise, get user camera and microphone stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }
      // Stop any existing stream before starting a new one
      if (currentStream.current) {
        currentStream.current.getTracks().forEach((track) => track.stop());
      }
      currentStream.current = stream;
      videoRef.current.srcObject = stream;
      setSessionStarted(true);
      setIsScreenSharing(isScreen);
      setError("");

      // If host, emit a startSession event with dummy session data
      if (isHost && socketRef.current) {
        const sessionData = {
          id: Date.now().toString(), // Unique ID; replace with your own method if needed
          title: isScreen ? "Screen Share Session" : "Camera Session",
          participants: 1, // Initial count; update as needed
          duration: "00:00", // Dummy duration; update with timer logic if needed
        };
        socketRef.current.emit("startSession", sessionData);
        if (onSessionStart) onSessionStart();
      }
    } catch (err) {
      setError(`Failed to start ${isScreen ? "screen share" : "stream"}: ${err.message}`);
      console.error(err);
    }
  };

  // Toggle between screen share and camera stream
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      await startStream(true);
    } else {
      await startStream(false);
    }
  };

  // Function to end the stream and notify the server if host
  const endStream = () => {
    if (currentStream.current) {
      currentStream.current.getTracks().forEach((track) => track.stop());
      currentStream.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setSessionStarted(false);
    setIsScreenSharing(false);
    // If host, emit endSession event with a dummy session id (should match the one emitted during start)
    if (isHost && socketRef.current) {
      // In a real app, you would store the session id when starting the session
      socketRef.current.emit("endSession", "dummy-session-id");
      if (onSessionEnd) onSessionEnd();
    }
  };

  // Cleanup stream on component unmount
  useEffect(() => {
    return () => endStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render different UI for host and viewer
  if (isHost) {
    return (
      <div className="live-session host-view">
        <h1>Live Session Page (Debug)</h1> {/* Temporary debug element */}
        <div
          className={`video-container ${sessionStarted ? "active" : ""} ${
            sessionStarted && isScreenSharing ? "full-screen" : ""
          }`}
        >
          <video ref={videoRef} autoPlay playsInline muted />
          {sessionStarted && (
            <div className="control-overlay">
              <div className="stream-indicator">
                {isScreenSharing ? "Sharing Screen" : "Sharing Camera"}
              </div>
              <div className="control-buttons">
                <button className="toggle-btn" onClick={toggleScreenShare}>
                  {isScreenSharing ? "↻ Switch to Camera" : "↻ Share Screen"}
                </button>
                <button className="end-btn" onClick={endStream}>
                  ⏹️ End Stream
                </button>
              </div>
            </div>
          )}
        </div>
        {!sessionStarted && (
          <div className="preview-controls">
            <h2>Start New Session</h2>
            <div className="preview-options">
              <button className="start-btn" onClick={() => startStream(false)}>
                🎥 Start Camera
              </button>
              <button className="screen-share-btn" onClick={() => startStream(true)}>
                🖥️ Share Screen
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="error-message" style={{ color: "red", padding: "1rem" }}>
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  // Viewer UI: list active sessions updated in real-time via Socket.io
  return (
    <div className="live-session viewer-view">
      <h2>Live Sessions</h2>
      <div className="session-grid">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <div className="empty-state">🔍 No active sessions found</div>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-preview" />
              <div className="session-info">
                <h3>{session.title}</h3>
                <div className="session-meta">
                  <span>👤 {session.participants} participants</span>
                  <span>⏱️ {session.duration}</span>
                </div>
                <button className="join-btn" onClick={() => console.log("Joining:", session.id)}>
                  ▶️ Join Session
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveSession;



