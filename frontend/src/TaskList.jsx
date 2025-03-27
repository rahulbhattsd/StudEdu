import React, { useEffect, useState } from "react";
import "./TaskList.css";

// Helper function to format a date as YYYY-MM-DD
const formatLocalDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Set API base URL conditionally based on environment
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const TaskList = ({ userId, selectedDate }) => {
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
        if (!response.ok) throw new Error("Failed to fetch tasks");
        const data = await response.json();
        const selectedStr = formatLocalDate(selectedDate);
        const filteredTasks = data.filter(
          (task) => formatLocalDate(task.due_date) === selectedStr
        );
        setTasks(filteredTasks);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId && selectedDate) fetchTasks();
  }, [userId, selectedDate]);

  return (
    <div className="task-list">
      <h2>Tasks for {new Date(selectedDate).toLocaleDateString()}</h2>
      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="task-item">
            <div className="task-content">
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <div className="task-meta">
                <span className="due-date">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
                {task.completed ? (
                  <span>✓ Completed</span>
                ) : (
                  <button onClick={() => markTaskDone(task.id)}>
                    Mark as Done
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="no-tasks">No tasks for this date</p>
      )}
    </div>
  );
};

export default TaskList;








