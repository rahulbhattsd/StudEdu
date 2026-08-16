import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import SemesterGrade from "./SemesterGrade";
import TaskList from "./TaskList";
import Calendar from "./Calendar";
import UpcomingTasks from "./UpcomingTask";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

const Dashboard = (props) => {
  const userId = props.userId || localStorage.getItem("userId");
  const navigate = useNavigate();
  const [isHost] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userName, setUserName] = useState("User");
  const [fetchError, setFetchError] = useState(null);

  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [mockTests, setMockTests] = useState([]);

  // Refs for sidebar and toggle button
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      console.error("No valid userId provided");
      setFetchError("User not logged in");
      return;
    }
    // Use production URL if in production; else use localhost
    const API_BASE_URL =
      process.env.NODE_ENV === "production"
        ? "https://studedu.onrender.com"
        : "http://localhost:5000";

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
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

    // Fetch Syllabus
    fetch(`${API_BASE_URL}/api/syllabus/${userId}`)
      .then(res => res.json())
      .then(data => setSyllabusTopics(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching syllabus:", err));

    // Fetch Study Sessions
    fetch(`${API_BASE_URL}/api/study-sessions/${userId}`)
      .then(res => res.json())
      .then(data => setStudySessions(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching study sessions:", err));

    // Fetch Mock Tests
    fetch(`${API_BASE_URL}/api/mocks/${userId}`)
      .then(res => res.json())
      .then(data => setMockTests(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching mocks:", err));

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

  // --- DERIVED VALUES ---

  // 1. Syllabus Math
  const subjectsMap = {};
  let totalTopicPercent = 0;
  syllabusTopics.forEach(topic => {
    const stages = topic.stages || {};
    const trues = [
      stages.lecture, stages.notes, stages.practice,
      stages.revision1, stages.revision2, stages.pyq
    ].filter(Boolean).length;
    const topicPercent = (trues / 6) * 100;

    if (!subjectsMap[topic.subject]) {
      subjectsMap[topic.subject] = { topics: [], totalPercent: 0 };
    }
    subjectsMap[topic.subject].topics.push({ ...topic, topicPercent });
    subjectsMap[topic.subject].totalPercent += topicPercent;
    totalTopicPercent += topicPercent;
  });

  const subjectStats = Object.keys(subjectsMap).map(sub => {
    const s = subjectsMap[sub];
    return {
      subject: sub,
      subjectPercent: s.totalPercent / s.topics.length,
      topics: s.topics
    };
  });

  const overallSyllabusPercent = syllabusTopics.length > 0
    ? totalTopicPercent / syllabusTopics.length
    : 0;

  // 2. Study Hours Math
  const totalStudyHours = studySessions.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0).toFixed(1);

  // 3. Consistency Streak & Daily Hours Map
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionMap = new Map();
  studySessions.forEach(s => {
    const dStr = new Date(s.date).toLocaleDateString('en-CA');
    if (!sessionMap.has(dStr)) sessionMap.set(dStr, 0);
    sessionMap.set(dStr, sessionMap.get(dStr) + parseFloat(s.hours || 0));
  });

  const checkDateStr = (dateObj) => dateObj.toLocaleDateString('en-CA');

  let currentStreak = 0;
  let d = new Date(today);

  if (!sessionMap.get(checkDateStr(d)) || sessionMap.get(checkDateStr(d)) === 0) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const dStr = checkDateStr(d);
    if (sessionMap.get(dStr) && sessionMap.get(dStr) > 0) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // 4. Mocks Math
  const totalMocks = mockTests.length;

  // 5. Compact Contribution Strip (Last 90 days)
  const past90Days = [];
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - 89);

  let currDay = new Date(startDay);
  while (currDay <= today) {
    const dStr = checkDateStr(currDay);
    const h = sessionMap.get(dStr) || 0;
    let level = "level-0";
    if (h > 0 && h <= 2) level = "level-1";
    else if (h > 2 && h <= 4) level = "level-2";
    else if (h > 4) level = "level-3";

    past90Days.push({ date: dStr, level });
    currDay.setDate(currDay.getDate() + 1);
  }

  // 6. Mock Performance Chart
  const fullMocks = mockTests
    .filter(m => m.mock_type === "full")
    .sort((a, b) => new Date(a.test_date) - new Date(b.test_date));

  const recent10FullMocks = fullMocks.slice(-10);

  const mockChartData = {
    labels: recent10FullMocks.map(m => {
      const md = new Date(m.test_date);
      return `${md.getMonth() + 1}/${md.getDate()}`;
    }),
    datasets: [{
      label: 'Score %',
      data: recent10FullMocks.map(m => ((m.scored_marks / m.total_marks) * 100).toFixed(1)),
      borderColor: '#00b894',
      backgroundColor: '#00b894',
      tension: 0.1
    }]
  };
  const mockChartOptions = {
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score %' } } }
  };

  // 7. Weak Areas Card
  const allTopicsSorted = [];
  subjectStats.forEach(s => allTopicsSorted.push(...s.topics));
  const weakTopics = allTopicsSorted
    .filter(t => t.topicPercent < 100)
    .sort((a, b) => a.topicPercent - b.topicPercent)
    .slice(0, 3);

  // 8. Preparation Health Card
  const syllabusScore = overallSyllabusPercent;

  let revisionTrues = 0;
  syllabusTopics.forEach(t => {
    if (t.stages?.revision1) revisionTrues++;
    if (t.stages?.revision2) revisionTrues++;
  });
  const revisionScore = syllabusTopics.length > 0 ? (revisionTrues / (2 * syllabusTopics.length)) * 100 : 0;

  let distinctDaysLast30 = 0;
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);
  let cDay = new Date(thirtyDaysAgo);
  while(cDay <= today) {
    if ((sessionMap.get(checkDateStr(cDay)) || 0) > 0) distinctDaysLast30++;
    cDay.setDate(cDay.getDate() + 1);
  }
  const consistencyScore = Math.min(100, (distinctDaysLast30 / 30) * 100);

  const recent5FullMocks = fullMocks.slice(-5);
  let mockPerfSum = 0;
  recent5FullMocks.forEach(m => {
    mockPerfSum += (m.scored_marks / m.total_marks) * 100;
  });
  const mockPerformanceScore = recent5FullMocks.length > 0 ? mockPerfSum / recent5FullMocks.length : 0;

  let mockImprovementScore = 50;
  let mockTrendText = "Not enough data yet";
  if (fullMocks.length >= 6) {
    const recent3 = fullMocks.slice(-3);
    const prev3 = fullMocks.slice(-6, -3);

    const avgRecent = recent3.reduce((acc, m) => acc + (m.scored_marks / m.total_marks) * 100, 0) / 3;
    const avgPrev = prev3.reduce((acc, m) => acc + (m.scored_marks / m.total_marks) * 100, 0) / 3;

    const delta = avgRecent - avgPrev;
    mockImprovementScore = Math.min(100, Math.max(0, 50 + delta * 5));

    if (delta > 2) mockTrendText = "Improving";
    else if (delta < -2) mockTrendText = "Declining";
    else mockTrendText = "Stable";
  }

  const sectionalMocksFiltered = mockTests.filter(m => m.mock_type === "sectional" && m.attempted > 0);
  let secAccSum = 0;
  sectionalMocksFiltered.forEach(m => {
    secAccSum += (m.correct / m.attempted) * 100;
  });
  const sectionalAccuracyScore = sectionalMocksFiltered.length > 0 ? secAccSum / sectionalMocksFiltered.length : 0;

  let last7Hours = 0;
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  let rDay = new Date(sevenDaysAgo);
  while(rDay <= today) {
    last7Hours += (sessionMap.get(checkDateStr(rDay)) || 0);
    rDay.setDate(rDay.getDate() + 1);
  }
  const recentActivityScore = Math.min(100, (last7Hours / 14) * 100);

  const healthScore = Math.round(
    0.25 * syllabusScore +
    0.15 * revisionScore +
    0.15 * consistencyScore +
    0.20 * mockPerformanceScore +
    0.10 * mockImprovementScore +
    0.10 * sectionalAccuracyScore +
    0.05 * recentActivityScore
  );

  let biggestWeakness = "Add syllabus topics to see this.";
  let strongestArea = "Add syllabus topics to see this.";
  if (subjectStats.length > 0) {
     const sortedSubj = [...subjectStats].sort((a,b) => a.subjectPercent - b.subjectPercent);
     biggestWeakness = sortedSubj[0].subject;
     strongestArea = sortedSubj[sortedSubj.length - 1].subject;
  }

  let consistencyText = "Needs work";
  if (currentStreak >= 14) consistencyText = "Excellent";
  else if (currentStreak >= 7) consistencyText = "Good";
  else if (currentStreak >= 3) consistencyText = "Building";

  let recFocus = "Add syllabus topics to get a recommendation";
  if (weakTopics.length >= 2) {
     recFocus = `${weakTopics[0].topic} + ${weakTopics[1].topic}`;
  } else if (weakTopics.length === 1) {
     recFocus = weakTopics[0].topic;
  } else if (syllabusTopics.length > 0) {
     recFocus = "All caught up!";
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`dashboard-sidebar ${isSidebarOpen ? "open" : "closed"}`}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
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
            <h1>Hi, {userName} 👋</h1>
            <p>Welcome back, nice to see you again!</p>
          </div>
        </header>

        {/* --- STATS STRIP --- */}
        <div className="stats-strip">
          <div className="stat-box">
            <span className="stat-box-label">Syllabus</span>
            <span className="stat-box-value">{Math.round(overallSyllabusPercent)}%</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Study Hours</span>
            <span className="stat-box-value">{totalStudyHours}h</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Streak</span>
            <span className="stat-box-value">🔥 {currentStreak}</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Mocks</span>
            <span className="stat-box-value">{totalMocks}</span>
          </div>
        </div>

        {/* --- COMPACT CONTRIBUTION STRIP --- */}
        <div className="compact-contribution-strip">
           <div className="compact-squares-container">
             {past90Days.map((d, i) => (
                <div key={i} className={`compact-square ${d.level}`} title={d.date} />
             ))}
           </div>
           <button className="btn btn-small" onClick={() => navigate("/calendar")}>View full calendar →</button>
        </div>

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
              <Calendar
                userId={userId}
                onDateSelect={(date) => setSelectedDate(date)}
              />
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

        {/* --- NEW SECTIONS BELOW GRID --- */}
        <div className="dashboard-bottom-sections">

           {/* SYLLABUS PROGRESS CARD */}
           <div className="card full-width-card">
              <h3>Syllabus Progress</h3>
              {syllabusTopics.length === 0 ? (
                 <p>No syllabus topics yet — <Link to="/syllabus">add some on the Syllabus page.</Link></p>
              ) : (
                 <div className="syllabus-progress-list">
                    {subjectStats.map(s => (
                       <div key={s.subject} className="syllabus-progress-item">
                          <div className="syllabus-progress-label">
                             <span>{s.subject}</span>
                             <span>{Math.round(s.subjectPercent)}%</span>
                          </div>
                          <div className="syllabus-progress-bar-bg">
                             <div className="syllabus-progress-bar-fill" style={{ width: `${s.subjectPercent}%` }}></div>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* MOCK PERFORMANCE CARD */}
           <div className="card full-width-card">
              <h3>Mock Performance</h3>
              {fullMocks.length === 0 ? (
                 <p>No mock tests logged yet — <Link to="/mocks">log one on the Mock Tests page.</Link></p>
              ) : (
                 <div className="mock-chart-container">
                    <Line data={mockChartData} options={mockChartOptions} />
                 </div>
              )}
           </div>

           {/* WEAK AREAS CARD */}
           <div className="card full-width-card">
              <h3>Weak Areas</h3>
              {weakTopics.length === 0 ? (
                 <p>No weak areas detected yet.</p>
              ) : (
                 <ul className="weak-areas-list">
                    {weakTopics.map(t => (
                       <li key={t.id}>{t.topic} ({t.subject}) — {Math.round(t.topicPercent)}% mastery</li>
                    ))}
                 </ul>
              )}
           </div>

           {/* PREPARATION HEALTH CARD */}
           <div className="card full-width-card preparation-health-card">
              <h3>Preparation Health</h3>
              <div className="health-score-display">
                 <div className="health-score-number">{healthScore}/100</div>
                 <div className="health-score-label">Preparation Health</div>
              </div>
              <div className="health-details">
                 <p><strong>Biggest weakness:</strong> {biggestWeakness}</p>
                 <p><strong>Strongest area:</strong> {strongestArea}</p>
                 <p><strong>Consistency:</strong> {consistencyText}</p>
                 <p><strong>Mock trend:</strong> {mockTrendText}</p>
                 <p><strong>Recommended focus:</strong> {recFocus}</p>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
