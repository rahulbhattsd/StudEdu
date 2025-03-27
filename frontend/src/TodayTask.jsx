import React, { useState, useEffect } from "react";
import "./TodayTask.css";

// Helper function to format a date as YYYY-MM-DD
const formatLocalDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Set API base URL based on environment
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const TodayTasks = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to mark a task as done
  const markTaskDone = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const updatedTask = await response.json();
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? updatedTask : task))
      );
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const data = await response.json();
        const todayStr = formatLocalDate(new Date());
        const todayTasks = data.filter(
          (task) => formatLocalDate(task.due_date) === todayStr
        );
        setTasks(todayTasks);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchTasks();
    }
  }, [userId]);

  return (
    <div className="today-tasks-container">
      <h2 className="today-tasks-title">Today Tasks</h2>
      <div className="tasks-list">
        {loading ? (
          <p>Loading tasks...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : tasks.length > 0 ? (
          tasks.map((task, index) => (
            <div
              key={task.id}
              className={`task-item ${index === 0 ? "task-item-bordered" : ""}`}
            >
              <div className="task-details">
                <img
                  src={task.image || "default-task-image.jpg"}
                  alt={task.title}
                  className="task-image"
                />
                <div className="task-text">
                  <p className="task-title">{task.title}</p>
                  <p className="task-subtext">{task.description}</p>
                  <p className="task-subtext">
                    {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="task-actions">
                {task.completed ? (
                  <span>✓ Completed</span>
                ) : (
                  <button onClick={() => markTaskDone(task.id)}>
                    Mark as Done
                  </button>
                )}
                <img
                  src="more-options.jpg"
                  alt="More Options"
                  className="action-icon"
                />
              </div>
            </div>
          ))
        ) : (
          <p>No tasks for today!</p>
        )}
      </div>
      <button className="view-tasks-button">View all tasks</button>
    </div>
  );
};

export default TodayTasks;











