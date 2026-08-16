import React, { useState, useEffect } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./Calendar.css";

const Calendar = ({ userId, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);

  // Set API URL based on environment
  const tasksApiUrl =
    process.env.NODE_ENV === "production"
      ? "https://studedu.onrender.com/api/tasks/"
      : "http://localhost:5000/api/tasks/";

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${tasksApiUrl}${userId}`);
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    if (userId) fetchTasks();
  }, [userId, tasksApiUrl]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    onDateSelect(date);
  };

  // Check for tasks by comparing dates (using due_date)
  const hasTasks = (date) => {
    return tasks.some(task => {
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="empty-day"></div>);
    }

    // Render days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();

      calendarDays.push(
        <div 
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasTasks(date) ? 'has-tasks' : ''}`}
          onClick={() => handleDayClick(date)}
        >
          {day}
        </div>
      );
    }
    return calendarDays;
  };

  return (
    <div className="calendar-container">
      <div className="top-bar">
        <div className="search-container">
          <input type="text" placeholder="Search" className="search-input" />
          <i className="fas fa-search search-icon"></i>
        </div>
        <div className="icons-container">
          <i className="fas fa-bell notification-icon"></i>
        </div>
      </div>

      <div className="calendar-card">
        <div className="calendar-header">
          <h2>
            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
          </h2>
          <div className="nav-buttons">
            <button onClick={handlePrevMonth} className="nav-button">
              <i className="fas fa-chevron-left"></i>
            </button>
            <button onClick={handleNextMonth} className="nav-button">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-label">{day}</div>
          ))}
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
};

export default Calendar;





