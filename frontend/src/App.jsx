import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import Resource from "./Resources";
import LoginSignup from "./LoginSignup";
import LiveSession from "./LiveSession"; // Import LiveSession
import "./App.css";

function App() {
  const currentUserId = localStorage.getItem("userId");

  return (
    <Router>
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<LoginSignup />} />
            <Route
              path="/"
              element={currentUserId ? <Dashboard userId={currentUserId} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/resources"
              element={currentUserId ? <Resource userId={currentUserId} /> : <Navigate to="/login" replace />}
            />
            {/* Protected Live Session Route */}
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

