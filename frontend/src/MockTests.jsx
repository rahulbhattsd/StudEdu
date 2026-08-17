import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from "chart.js";
import Sidebar from "./Sidebar";
import "./Dashboard.css";
import "./MockTests.css";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const MockTests = ({ userId }) => {
  const [mocks, setMocks] = useState([]);
  const [mockType, setMockType] = useState("full");
  const [tier, setTier] = useState("tier1");
  const [subject, setSubject] = useState("Mathematics");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalMarks, setTotalMarks] = useState("");
  const [scoredMarks, setScoredMarks] = useState("");
  const [attempted, setAttempted] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [timeTakenMinutes, setTimeTakenMinutes] = useState("");

  const [selectedSubject, setSelectedSubject] = useState("Mathematics");

  useEffect(() => {
    if (userId) {
      fetch(`${API_BASE_URL}/api/mocks/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          const safeData = Array.isArray(data) ? data : [];
          setMocks(safeData);
          const sectional = safeData.filter(m => m.mock_type === "sectional");
          if (sectional.length > 0) {
            setSelectedSubject(sectional[0].subject);
          }
        })
        .catch((err) => console.error("Error fetching mocks:", err));
    }
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      userId,
      mockType,
      tier: mockType === "full" ? tier : null,
      subject: mockType === "sectional" ? subject : null,
      testDate: date,
      totalMarks: Number(totalMarks),
      scoredMarks: Number(scoredMarks),
      attempted: Number(attempted),
      correct: Number(correct),
      wrong: Number(wrong),
      timeTakenMinutes: Number(timeTakenMinutes)
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/mocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newMock = await res.json();
        // Keep order ascending by test_date
        const updatedMocks = [...mocks, newMock].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
        setMocks(updatedMocks);

        // Reset form (except mockType)
        if (mockType === "full") {
          setTier("tier1");
        } else {
          setSubject("Mathematics");
        }
        setDate(new Date().toISOString().split('T')[0]);
        setTotalMarks("");
        setScoredMarks("");
        setAttempted("");
        setCorrect("");
        setWrong("");
        setTimeTakenMinutes("");
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to add mock test");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mocks/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMocks(mocks.filter(m => m.id !== id));
      } else {
        alert("Failed to delete mock test");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const formatDateLabel = (isoDate) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const fullMocks = mocks.filter(m => m.mock_type === "full");
  const tier1Mocks = fullMocks.filter(m => m.tier === "tier1");
  const tier2Mocks = fullMocks.filter(m => m.tier === "tier2");
  const sectionalMocks = mocks.filter(m => m.mock_type === "sectional");

  // Chart 1: Full Mock Performance
  const chart1Data = {
    labels: fullMocks.map(m => formatDateLabel(m.test_date)),
    datasets: [{
      label: 'Score %',
      data: fullMocks.map(m => Number(((m.scored_marks / m.total_marks) * 100).toFixed(1))),
      borderColor: '#00b894',
      backgroundColor: '#00b894',
      tension: 0.1
    }]
  };
  const chart1Options = {
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score %' } } }
  };

  // Chart 2: Tier 1 Performance
  const chart2Data = {
    labels: tier1Mocks.map(m => formatDateLabel(m.test_date)),
    datasets: [{
      label: 'Score',
      data: tier1Mocks.map(m => m.scored_marks),
      borderColor: '#3498db',
      backgroundColor: '#3498db',
      tension: 0.1
    }]
  };
  const chart2Options = {
    scales: { y: { title: { display: true, text: 'Score' } } }
  };

  // Chart 3: Tier 2 Performance
  const chart3Data = {
    labels: tier2Mocks.map(m => formatDateLabel(m.test_date)),
    datasets: [{
      label: 'Score',
      data: tier2Mocks.map(m => m.scored_marks),
      borderColor: '#e74c3c',
      backgroundColor: '#e74c3c',
      tension: 0.1
    }]
  };
  const chart3Options = {
    scales: { y: { title: { display: true, text: 'Score' } } }
  };

  // Chart 4: Sectional Mock Performance
  const sectionalDates = [...new Set(sectionalMocks.map(m => m.test_date))].sort((a, b) => new Date(a) - new Date(b));
  const subjects = ["Mathematics", "English", "Reasoning", "General Awareness"];
  const colors = {
    "Mathematics": "#00b894",
    "English": "#3498db",
    "Reasoning": "#e74c3c",
    "General Awareness": "#f39c12"
  };

  const chart4Datasets = subjects.filter(subj => sectionalMocks.some(m => m.subject === subj)).map(subj => {
    return {
      label: subj,
      data: sectionalDates.map(d => {
        const mock = sectionalMocks.find(m => m.test_date === d && m.subject === subj);
        return mock ? Number(((mock.scored_marks / mock.total_marks) * 100).toFixed(1)) : null;
      }),
      borderColor: colors[subj],
      backgroundColor: colors[subj],
      spanGaps: true,
      tension: 0.1
    };
  });

  const chart4Data = {
    labels: sectionalDates.map(d => formatDateLabel(d)),
    datasets: chart4Datasets
  };
  const chart4Options = {
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score %' } } },
    plugins: { legend: { display: true } }
  };

  // Chart 5: Subject-wise Performance
  const selectedSubjectMocks = sectionalMocks.filter(m => m.subject === selectedSubject);
  const chart5Data = {
    labels: selectedSubjectMocks.map(m => formatDateLabel(m.test_date)),
    datasets: [{
      label: 'Score %',
      data: selectedSubjectMocks.map(m => Number(((m.scored_marks / m.total_marks) * 100).toFixed(1))),
      borderColor: colors[selectedSubject] || '#00b894',
      backgroundColor: colors[selectedSubject] || '#00b894',
      tension: 0.1
    }]
  };
  const chart5Options = {
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score %' } } }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-sidebar">
        <Sidebar />
      </div>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>Mock Tests</h1>
        </header>

        <div className="mock-tests-content">
          <div className="form-card">
            <h2>Log Mock Test</h2>
            <form onSubmit={handleSubmit} className="mock-form">
              <div className="form-group">
                <label>Mock Type</label>
                <select value={mockType} onChange={(e) => {
                  setMockType(e.target.value);
                  if (e.target.value === "full") {
                    setSubject("Mathematics");
                  } else {
                    setTier("tier1");
                  }
                }}>
                  <option value="full">Full Mock</option>
                  <option value="sectional">Sectional</option>
                </select>
              </div>

              {mockType === "full" && (
                <div className="form-group">
                  <label>Tier</label>
                  <select value={tier} onChange={(e) => setTier(e.target.value)}>
                    <option value="tier1">Tier 1</option>
                    <option value="tier2">Tier 2</option>
                  </select>
                </div>
              )}

              {mockType === "sectional" && (
                <div className="form-group">
                  <label>Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                    <option value="Reasoning">Reasoning</option>
                    <option value="General Awareness">General Awareness</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Total Marks</label>
                <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Scored Marks</label>
                <input type="number" step="0.1" value={scoredMarks} onChange={(e) => setScoredMarks(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Attempted</label>
                <input type="number" value={attempted} onChange={(e) => setAttempted(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Correct</label>
                <input type="number" value={correct} onChange={(e) => setCorrect(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Wrong</label>
                <input type="number" value={wrong} onChange={(e) => setWrong(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Time Taken (minutes)</label>
                <input type="number" value={timeTakenMinutes} onChange={(e) => setTimeTakenMinutes(e.target.value)} required />
              </div>

              <button type="submit" className="submit-btn">Add Mock Result</button>
            </form>
          </div>

          <div className="list-card">
            <h2>Past Mocks</h2>
            <div className="mock-list">
              {[...mocks].reverse().map(m => (
                <div key={m.id} className="mock-item">
                  <div className="mock-info">
                    <strong>{formatDateLabel(m.test_date)}</strong> - {m.mock_type === "full" ? `Full Mock (${m.tier})` : `Sectional (${m.subject})`}
                    <span>Score: {m.scored_marks}/{m.total_marks}</span>
                  </div>
                  <button className="delete-btn" onClick={() => handleDelete(m.id)}>Delete</button>
                </div>
              ))}
              {mocks.length === 0 && <p>No mocks logged yet.</p>}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Full Mock Performance</h2>
            <div className="chart-wrapper">
              {fullMocks.length > 0 ? (
                <Line data={chart1Data} options={chart1Options} />
              ) : (
                <p className="no-data-msg">No mocks logged yet for this view</p>
              )}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Tier 1 Performance</h2>
            <div className="chart-wrapper">
              {tier1Mocks.length > 0 ? (
                <Line data={chart2Data} options={chart2Options} />
              ) : (
                <p className="no-data-msg">No mocks logged yet for this view</p>
              )}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Tier 2 Performance</h2>
            <div className="chart-wrapper">
              {tier2Mocks.length > 0 ? (
                <Line data={chart3Data} options={chart3Options} />
              ) : (
                <p className="no-data-msg">No mocks logged yet for this view</p>
              )}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Sectional Mock Performance</h2>
            <div className="chart-wrapper">
              {chart4Datasets.length > 0 ? (
                <Line data={chart4Data} options={chart4Options} />
              ) : (
                <p className="no-data-msg">No mocks logged yet for this view</p>
              )}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Subject-wise Performance</h2>
            <div className="subject-filter">
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Reasoning">Reasoning</option>
                <option value="General Awareness">General Awareness</option>
              </select>
            </div>
            <div className="chart-wrapper">
              {selectedSubjectMocks.length > 0 ? (
                <Line data={chart5Data} options={chart5Options} />
              ) : (
                <p className="no-data-msg">No mocks logged yet for this view</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTests;
