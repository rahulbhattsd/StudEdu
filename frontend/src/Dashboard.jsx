import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import SemesterGrade from "./SemesterGrade";
import TaskList from "./TaskList";
import Calendar from "./Calendar";
import UpcomingTasks from "./UpcomingTask";
import "./Dashboard.css";

const Dashboard = (props) => {
  const userId = props.userId || localStorage.getItem("userId");
  const navigate = useNavigate();
  const [isHost] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userName, setUserName] = useState("User");
  const [fetchError, setFetchError] = useState(null);

  // Refs for sidebar and toggle button
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      console.error("No valid userId provided");
      setFetchError("User not logged in");
      return;
    }
    const fetchUser = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch user details");
        }
        setUserName(data.name || "User");
      } catch (error) {
        console.error("Error fetching user:", error);
        setFetchError(error.message);
      }
    };

    fetchUser();
  }, [userId]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Close sidebar if click is outside sidebar and toggle button
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  if (fetchError) {
    return <div className="dashboard-error">Error: {fetchError}</div>;
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <div ref={sidebarRef} className={`dashboard-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`dashboard-main ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <header className="dashboard-header">
          <button ref={toggleButtonRef} className="hamburger-toggle" onClick={toggleSidebar}>
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
          </button>
          <div className="header-content">
            <h1>Hi, {userName} 👋</h1>
            <p>Welcome back, nice to see you again!</p>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="grid-column">
            <div className="card" id="dashboard-section">
              <SemesterGrade userId={userId} />
            </div>
            <div className="card" id="schedule-section">
              <UpcomingTasks userId={userId} selectedDate={selectedDate} />
            </div>
          </div>

          <div className="grid-column">
            <div className="card calendar-card">
              <Calendar userId={userId} onDateSelect={(date) => setSelectedDate(date)} />
            </div>
            <div className="card">
              <TaskList userId={userId} selectedDate={selectedDate} />
            </div>
            <div className="card">
              <h3>Study Resources</h3>
              <p>Access and upload study materials.</p>
              <Link to="/resources" className="btn">
                Go to Resources
              </Link>
            </div>
            {/* Live Session Prompt */}
            <div className="card live-session-prompt">
              <h3>Live Session</h3>
              <p>Join an ongoing live session or start a new one.</p>
              <div className="live-session-buttons">
                <button className="btn" onClick={() => navigate("/live")}>
                  Join / Start Live Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

