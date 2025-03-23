import React, { useState, useEffect } from 'react';
import "./RightSidebar.css";

const RightSidebar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);

  // States for the "Add Task" form inputs
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");

  // Sample events get loaded when the month or year changes
  useEffect(() => {
    const sampleEvents = [
      { date: new Date(2024, 0, 25), time: '9:00', title: 'Project Meeting' },
      { date: new Date(2024, 0, 25), time: '14:00', title: 'Code Review' },
      { date: new Date(currentYear, currentMonth, 10), time: '10:00', title: 'Sprint Planning' },
      { date: new Date(currentYear, currentMonth, 20), time: '16:00', title: 'Demo Presentation' },
      { date: new Date(currentYear, currentMonth, 25), time: '16:00', title: 'Demo Presentation' },
    ];
    setEvents(sampleEvents);
  }, [currentMonth, currentYear]);

  // Determine the number of days and the first day of the month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Create calendar day elements (including empty placeholders for alignment)
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<span key={`empty-${i}`} className="date empty"></span>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(currentYear, currentMonth, i);
    const isSelected =
      selectedDate && selectedDate.getTime() === currentDate.getTime();

    days.push(
      <span
        key={i}
        className={`date ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedDate(currentDate)}
      >
        {i}
      </span>
    );
  }

  // Change month navigation
  const handleMonthChange = (delta) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDate(null);
  };

  // Month names for display
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Filter events for the selected date
  const filteredEvents = events.filter(event => {
    if (!selectedDate) return false;
    return (
      event.date.getDate() === selectedDate.getDate() &&
      event.date.getMonth() === selectedDate.getMonth() &&
      event.date.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Handler for adding a new event to the selected date
  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle || !newEventTime) {
      alert("Please fill in both title and time.");
      return;
    }
    // Create a new event object using the selected date
    const newEvent = {
      date: selectedDate,
      time: newEventTime,
      title: newEventTitle,
    };
    setEvents([...events, newEvent]);
    // Clear the form inputs after submission
    setNewEventTitle("");
    setNewEventTime("");
  };

  return (
    <div className="sidebar">
      <div className="calendar">
        <div className="calendar-header">
          <span className="nav-arrow" onClick={() => handleMonthChange(-1)}>&lt;</span>
          <span>{monthNames[currentMonth]} {currentYear}</span>
          <span className="nav-arrow" onClick={() => handleMonthChange(1)}>&gt;</span>
        </div>
        <div className="calendar-grid">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          {days}
        </div>
      </div>
      <div className="upcoming">
        <h2>Upcoming Tasks</h2>
        {selectedDate ? (
          <>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => (
                <div className="event" key={index}>
                  <div className="event-time">{event.time}</div>
                  <div className="event-title">{event.title}</div>
                </div>
              ))
            ) : (
              <p>No tasks for this day.</p>
            )}
            {/* Form to add a new task/event for the selected date */}
            <form onSubmit={handleAddEvent} className="add-event-form">
              <input
                type="text"
                placeholder="Task Title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                required
              />
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                required
              />
              <button type="submit">Add Task</button>
            </form>
          </>
        ) : (
          <p>Select a date to see tasks.</p>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

