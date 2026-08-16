import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import "./Dashboard.css";
import "./ConsistencyCalendar.css";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const ConsistencyCalendar = ({ userId }) => {
  const [sessionsMap, setSessionsMap] = useState(new Map());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Form State
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const [formDate, setFormDate] = useState(todayStr);
  const [formHours, setFormHours] = useState("");
  const [formSubjects, setFormSubjects] = useState("");
  const [formQuestions, setFormQuestions] = useState(0);
  const [formMessage, setFormMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch study sessions");
      }
      const data = await response.json();

      const newMap = new Map();
      data.forEach(row => {
        newMap.set(row.date, row);
      });
      setSessionsMap(newMap);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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

  // Compute Stats
  const computeStats = () => {
    let totalStudyDays = 0;
    let totalHours = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    const sortedRows = Array.from(sessionsMap.values())
      .filter(row => row.hours > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    totalStudyDays = sortedRows.length;
    totalHours = sortedRows.reduce((sum, row) => sum + row.hours, 0);

    // Compute longest streak
    let tempStreak = 0;
    let lastDate = null;
    for (const row of sortedRows) {
      const d = new Date(row.date + 'T00:00:00');
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffTime = d - lastDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      lastDate = d;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Compute current streak
    let walkDate = new Date();
    walkDate.setHours(0, 0, 0, 0);
    const walkDateStr = walkDate.toLocaleDateString('en-CA');

    const todayRow = sessionsMap.get(walkDateStr);
    if (!todayRow || todayRow.hours === 0) {
      // Start walk from yesterday
      walkDate.setDate(walkDate.getDate() - 1);
    }

    while (true) {
      const dStr = walkDate.toLocaleDateString('en-CA');
      const row = sessionsMap.get(dStr);
      if (row && row.hours > 0) {
        currentStreak++;
        walkDate.setDate(walkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalStudyDays, totalHours: totalHours.toFixed(1), longestStreak, currentStreak };
  };

  const stats = computeStats();

  // Compute Heatmap Grid
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  // Back to nearest Sunday
  const startDay = startDate.getDay();
  if (startDay !== 0) {
    startDate.setDate(startDate.getDate() - startDay);
  }

  const weeks = [];
  let current = new Date(startDate);
  let currentWeek = [];

  while (current <= endDate) {
    currentWeek.push(new Date(current));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);
  }
  // Fill remaining days of the last week with future dates
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(currentWeek);
  }

  const getLevel = (hours) => {
    if (!hours || hours === 0) return 0;
    if (hours <= 2) return 1;
    if (hours <= 4) return 2;
    return 3;
  };

  const handleDayClick = (dateObj) => {
    if (dateObj > today) return;
    const dateStr = dateObj.toLocaleDateString('en-CA');
    setSelectedDate(dateStr);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);

    const subjArray = formSubjects
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      userId,
      date: formDate,
      hours: parseFloat(formHours) || 0,
      subjects: subjArray,
      tasksCompleted: 0,
      mocksAttempted: 0,
      questionsSolved: parseInt(formQuestions, 10) || 0
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to log session");
      }

      setFormMessage({ type: 'success', text: 'Session logged successfully!' });
      setFormHours("");
      setFormSubjects("");
      setFormQuestions(0);

      await fetchSessions();
    } catch (err) {
      setFormMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFormMessage(null), 5000);
    }
  };

  const renderMonthLabels = () => {
    const labels = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      const currentMonth = firstDay.getMonth();
      if (currentMonth !== lastMonth) {
        labels.push(
          <span
            key={`month-${weekIndex}`}
            className="month-label"
            style={{ left: `${weekIndex * 17}px` }} // approx width of week column + gap (14px + 3px)
          >
            {firstDay.toLocaleString('default', { month: 'short' })}
          </span>
        );
        lastMonth = currentMonth;
      }
    });

    return labels;
  };

  const selectedRow = selectedDate ? sessionsMap.get(selectedDate) : null;

  return (
    <div className="dashboard-wrapper">
      <div
        ref={sidebarRef}
        className={`dashboard-sidebar ${isSidebarOpen ? "open" : "closed"}`}
      >
        <Sidebar />
      </div>

      <div className={`dashboard-main ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <header className="dashboard-header">
          <button
            ref={toggleButtonRef}
            className="hamburger-toggle"
            onClick={toggleSidebar}
          >
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
            <span className={`bar ${isSidebarOpen ? "open" : ""}`}></span>
          </button>
          <div className="header-content">
            <h1>Consistency Calendar</h1>
          </div>
        </header>

        <div className="consistency-calendar-container">

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">Current Streak</span>
              <span className="stat-value">{stats.currentStreak} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Longest Streak</span>
              <span className="stat-value">{stats.longestStreak} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Days</span>
              <span className="stat-value">{stats.totalStudyDays} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Hours</span>
              <span className="stat-value">{stats.totalHours} hrs</span>
            </div>
          </div>

          <div className="heatmap-card">
            <h2>Study Activity</h2>
            {loading && <p>Loading activity data...</p>}
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {!loading && !error && (
              <div className="heatmap-scroll-container">
                <div className="heatmap-wrapper">
                  <div className="months-row">
                    {renderMonthLabels()}
                  </div>
                  <div className="heatmap-grid">
                    {weeks.map((week, wIndex) => (
                      <div key={wIndex} className="week-column">
                        {week.map((day, dIndex) => {
                          const isFuture = day > today;
                          const dateStr = day.toLocaleDateString('en-CA');
                          const row = sessionsMap.get(dateStr);
                          const hours = row ? row.hours : 0;
                          const level = getLevel(hours);

                          return (
                            <div
                              key={`${wIndex}-${dIndex}`}
                              className={`day-cell ${isFuture ? 'day-cell-future' : `level-${level}`} ${!isFuture && !row ? 'day-cell-empty' : ''}`}
                              title={isFuture ? undefined : `${dateStr}: ${hours} hrs`}
                              onClick={() => handleDayClick(day)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedDate && (
            <div className="day-details-card">
              <h2>Activity on {selectedDate}</h2>
              {selectedRow ? (
                <div className="day-details-content">
                  <div className="detail-row">
                    <span className="detail-label">Hours Logged</span>
                    <span className="detail-value">{selectedRow.hours} hrs</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Subjects</span>
                    <span className="detail-value">
                      {selectedRow.subjects && selectedRow.subjects.length > 0
                        ? selectedRow.subjects.join(", ")
                        : "None"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tasks Completed</span>
                    <span className="detail-value">{selectedRow.tasks_completed || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Mocks Attempted</span>
                    <span className="detail-value">{selectedRow.mocks_attempted || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Questions Solved</span>
                    <span className="detail-value">{selectedRow.questions_solved || 0}</span>
                  </div>
                </div>
              ) : (
                <p>No study activity logged for {selectedDate}.</p>
              )}
            </div>
          )}

          <div className="log-session-card">
            <h2>Log Session</h2>
            <form className="log-session-form" onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  max={todayStr}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subjects (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Math, Physics"
                  value={formSubjects}
                  onChange={(e) => setFormSubjects(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Questions Solved</label>
                <input
                  type="number"
                  min="0"
                  value={formQuestions}
                  onChange={(e) => setFormQuestions(e.target.value)}
                />
              </div>
              <div className="form-group">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging...' : 'Log Session'}
                </button>
              </div>
            </form>
            {formMessage && (
              <div className={`message ${formMessage.type}`}>
                {formMessage.text}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConsistencyCalendar;
