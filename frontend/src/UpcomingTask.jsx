import React, { useState, useEffect } from "react";
import "./UpcomingTasks.css";

// Helper function to format a date as YYYY-MM-DD
const formatLocalDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Set API base URL conditionally
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://studedu.onrender.com"
    : "http://localhost:5000";

const UpcomingTasks = ({ userId, selectedDate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Use local date format for dueDate; initialize with selectedDate if available
  const [dueDate, setDueDate] = useState(
    selectedDate ? formatLocalDate(selectedDate) : ""
  );
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [priority, setPriority] = useState("medium");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [completed, setCompleted] = useState(false);
  const [tasks, setTasks] = useState([]);

  // Update dueDate when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setDueDate(formatLocalDate(selectedDate));
    }
  }, [selectedDate]);

  // Fetch all tasks for the user
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    if (userId) fetchTasks();
  }, [userId]);

  // Handler to add a new task
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newTask = {
      userId,
      title,
      description,
      dueDate,
      completed,
      subject,
      topic,
      priority,
    };
    if (estimatedDuration) {
      newTask.estimatedDuration = Number(estimatedDuration);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTask),
      });
      const savedTask = await response.json();
      
      // Update tasks list locally
      setTasks([...tasks, savedTask]);
      
      // Reset form fields (keeping dueDate if a date is selected)
      setTitle("");
      setDescription("");
      setSubject("");
      setTopic("");
      setPriority("medium");
      setEstimatedDuration("");
      setCompleted(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

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

      // POST to study-sessions on successful completion (fire-and-forget)
      try {
        const task = tasks.find(t => t.id === taskId);
        await fetch(`${API_BASE_URL}/api/study-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            date: formatLocalDate(new Date()),
            hours: 0,
            subjects: task && task.subject ? [task.subject] : [],
            tasksCompleted: 1,
            mocksAttempted: 0,
            questionsSolved: 0
          })
        });
      } catch (logErr) {
        console.error("Error logging study session for completed task:", logErr);
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  // Determine which tasks to display:
  // – If a future date is selected, show tasks for that date.
  // – Otherwise, show all upcoming tasks (with due dates after today).
  const todayStr = formatLocalDate(new Date());
  const selectedStr = selectedDate ? formatLocalDate(selectedDate) : "";
  let displayedTasks = [];
  if (selectedDate && selectedStr > todayStr) {
    displayedTasks = tasks.filter(
      (task) => formatLocalDate(task.due_date) === selectedStr
    );
  } else {
    displayedTasks = tasks.filter(
      (task) => formatLocalDate(task.due_date) > todayStr
    );
  }

  return (
    <div className="upcoming-tasks-container">
      <div className="upcoming-header">
        <h2 className="upcoming-title">Upcoming Tasks</h2>
        <div className="date-toggle-container">
          <button className="date-toggle-button">
            Today <span className="arrow-down">▼</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <input
          type="text"
          placeholder="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Task Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          type="text"
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="number"
          placeholder="Duration (mins)"
          min="0"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(e.target.value)}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
        <button type="submit">Add Task</button>
      </form>

      <h3>Your Upcoming Tasks</h3>
      <ul className="task-list">
        {displayedTasks.map((task) => (
          <li key={task.id} className="task-item">
            <h4>{task.title}</h4>
            <p>{task.description}</p>
            <div className="task-badges">
              {task.subject && <span className="badge badge-subject">{task.subject}</span>}
              {task.topic && <span className="badge badge-topic">{task.topic}</span>}
              {task.priority && <span className={`badge badge-priority-${task.priority}`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>}
              {task.estimated_duration && <span className="badge badge-duration">{task.estimated_duration} min</span>}
            </div>
            <p>Due: {new Date(task.due_date).toLocaleDateString()}</p>
            <p>
              Status:{" "}
              {task.completed ? (
                <span>✓ Completed</span>
              ) : (
                <button onClick={() => markTaskDone(task.id)}>
                  Mark as Done
                </button>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpcomingTasks;














