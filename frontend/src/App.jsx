import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import Resource from "./Resources";
import LoginSignup from "./LoginSignup";
import LiveSession from "./LiveSession";
import "./App.css";

function App() {
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem("userId"));

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUserId(localStorage.getItem("userId"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<LoginSignup setCurrentUserId={setCurrentUserId} />} />
            <Route
              path="/"
              element={currentUserId ? <Dashboard userId={currentUserId} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/resources"
              element={currentUserId ? <Resource userId={currentUserId} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/live"
              element={currentUserId ? <LiveSession isHost={true} /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


