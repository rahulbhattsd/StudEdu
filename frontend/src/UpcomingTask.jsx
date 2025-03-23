import React, { useState, useEffect } from "react";
import "./UpcomingTasks.css";

const formatLocalDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const UpcomingTasks = ({ userId, selectedDate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Use local date format for dueDate
  const [dueDate, setDueDate] = useState(
    selectedDate ? formatLocalDate(selectedDate) : ""
  );
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
        const response = await fetch(`http://localhost:5000/api/tasks/${userId}`);
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
    };

    try {
      const response = await fetch("http://localhost:5000/api/tasks", {
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
      setCompleted(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Function to mark a task as done
  const markTaskDone = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
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













