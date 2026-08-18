import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import "./Dashboard.css";
import "./Syllabus.css";
import { flattenSscCglSyllabus } from "./data/sscCglSyllabus";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const Syllabus = ({ userId }) => {
  const [syllabusData, setSyllabusData] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inlineErrors, setInlineErrors] = useState({});
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetMessage, setPresetMessage] = useState(null);

  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/syllabus/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch syllabus data");
        }
        const data = await response.json();
        setSyllabusData(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSyllabus();
    }
  }, [userId]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

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

  // Group client-side into { [subject]: [topics sorted by sort_order] }
  const groupedData = syllabusData.reduce((acc, row) => {
    // Case-insensitive match for existing subject
    const existingSubject = Object.keys(acc).find(
      (s) => s.toLowerCase() === row.subject.toLowerCase()
    );
    const key = existingSubject || row.subject;

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {});

  Object.keys(groupedData).forEach(subject => {
    groupedData[subject].sort((a, b) => a.sort_order - b.sort_order);
  });

  const handleAddTopic = async (e) => {
    e.preventDefault();
    const subjectTrimmed = newSubject.trim();
    const topicTrimmed = newTopic.trim();

    if (!subjectTrimmed || !topicTrimmed) return;

    // Reuse subject if it already exists (case-insensitive)
    const existingSubject = Object.keys(groupedData).find(
      (s) => s.toLowerCase() === subjectTrimmed.toLowerCase()
    );
    const resolvedSubject = existingSubject || subjectTrimmed;

    const currentTopics = groupedData[resolvedSubject] || [];
    const sortOrder = currentTopics.length;

    try {
      const response = await fetch(`${API_BASE_URL}/api/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subject: resolvedSubject,
          topic: topicTrimmed,
          sortOrder
        })
      });

      if (!response.ok) {
        throw new Error("Failed to add topic");
      }

      const newRow = await response.json();
      setSyllabusData(prev => [...prev, newRow]);
      setNewSubject("");
      setNewTopic("");
    } catch (err) {
      setError("Error adding topic: " + err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLoadSscCglPreset = async () => {
    setPresetLoading(true);
    setPresetMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/syllabus/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, topics: flattenSscCglSyllabus() })
      });

      if (!response.ok) {
        throw new Error("Failed to load SSC CGL syllabus");
      }

      const result = await response.json();
      if (result.data && result.data.length > 0) {
        setSyllabusData(prev => [...prev, ...result.data]);
      }
      setPresetMessage(
        result.inserted > 0
          ? `Added ${result.inserted} topics.`
          : "Already up to date — nothing new to add."
      );
    } catch (err) {
      setPresetMessage("Error loading syllabus: " + err.message);
    } finally {
      setPresetLoading(false);
      setTimeout(() => setPresetMessage(null), 5000);
    }
  };

  const handleToggleStage = async (id, stageName, currentValue) => {
    const topicIndex = syllabusData.findIndex(t => t.id === id);
    if (topicIndex === -1) return;
    const topic = syllabusData[topicIndex];

    const updatedStages = { ...topic.stages, [stageName]: !currentValue };

    // Optimistic update
    const newSyllabusData = [...syllabusData];
    newSyllabusData[topicIndex] = { ...topic, stages: updatedStages };
    setSyllabusData(newSyllabusData);

    // Clear any previous inline error for this topic
    setInlineErrors(prev => ({ ...prev, [id]: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/syllabus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: updatedStages })
      });

      if (!response.ok) {
        throw new Error("Failed to update stage");
      }
    } catch (err) {
      // Revert local change and show inline error message
      setInlineErrors(prev => ({ ...prev, [id]: "Failed to update stage: " + err.message }));
      setTimeout(() => setInlineErrors(prev => ({ ...prev, [id]: null })), 5000);
      setSyllabusData(syllabusData); // revert
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!window.confirm("Are you sure you want to delete this topic?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/syllabus/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete topic");
      }

      setSyllabusData(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Error deleting topic: " + err.message);
    }
  };

  // Completion math
  const topicPercent = (topic) => {
    const stages = topic.stages || {};
    const keys = ["lectures", "notes", "practice", "test", "revision1", "revision2"];
    const trueCount = keys.reduce((acc, key) => acc + (stages[key] ? 1 : 0), 0);
    return (trueCount / 6) * 100;
  };

  const subjectPercent = (subjectName) => {
    const topics = groupedData[subjectName] || [];
    if (topics.length === 0) return 0;
    const sum = topics.reduce((acc, topic) => acc + topicPercent(topic), 0);
    return sum / topics.length;
  };

  const overallPercent = () => {
    if (syllabusData.length === 0) return 0;
    const sum = syllabusData.reduce((acc, topic) => acc + topicPercent(topic), 0);
    return sum / syllabusData.length;
  };

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
            <h1>Syllabus</h1>
            <p>Track your topics per subject</p>
          </div>
        </header>

        <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr", padding: "2rem" }}>
          {loading ? (
            <p>Loading syllabus...</p>
          ) : error ? (
            <p>Error: {error}</p>
          ) : (
            <>
              <div className="card">
                <form onSubmit={handleAddTopic} className="add-topic-form">
                  <input
                    type="text"
                    placeholder="Subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Topic Name"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn">Add Topic</button>
                </form>
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleLoadSscCglPreset}
                    disabled={presetLoading}
                  >
                    {presetLoading ? "Loading..." : "Load SSC CGL Syllabus"}
                  </button>
                  {presetMessage && <span style={{ marginLeft: "0.75rem" }}>{presetMessage}</span>}
                </div>
              </div>

              {syllabusData.length > 0 && (
                <div className="card">
                  <div className="progress-header">
                    <h2>Overall: {Math.round(overallPercent())}%</h2>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.round(overallPercent())}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {syllabusData.length === 0 ? (
                <div className="card">
                  <p>No topics yet — add your first one above.</p>
                </div>
              ) : (
                Object.keys(groupedData).map(subject => (
                  <div key={subject} className="card">
                    <div className="subject-header">
                      <h3>{subject}</h3>
                      <span>{Math.round(subjectPercent(subject))}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.round(subjectPercent(subject))}%` }}
                      ></div>
                    </div>

                    <div className="topic-list">
                      {groupedData[subject].map(topic => (
                        <React.Fragment key={topic.id}>
                          <div className="topic-item">
                            <div className="topic-name">{topic.topic}</div>
                            <div className="topic-stages">
                              {[
                                { key: "lectures", label: "Lectures" },
                                { key: "notes", label: "Notes" },
                                { key: "practice", label: "Practice" },
                                { key: "test", label: "Test" },
                                { key: "revision1", label: "Revision 1" },
                                { key: "revision2", label: "Revision 2" }
                              ].map(stage => (
                                <label key={stage.key} className="stage-label">
                                  <input
                                    type="checkbox"
                                    checked={!!(topic.stages && topic.stages[stage.key])}
                                    onChange={() => handleToggleStage(topic.id, stage.key, !!(topic.stages && topic.stages[stage.key]))}
                                  />
                                  {stage.label}
                                </label>
                              ))}
                            </div>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteTopic(topic.id)}
                              title="Delete topic"
                            >
                              &times;
                            </button>
                          </div>
                          {inlineErrors[topic.id] && (
                            <div className="inline-error">{inlineErrors[topic.id]}</div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Syllabus;
