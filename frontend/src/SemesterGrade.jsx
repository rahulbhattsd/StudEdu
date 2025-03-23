import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import "./SemesterGrade.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const SemesterGrade = (props) => {
  // If userId is passed as a prop, use it; otherwise, get it from localStorage
  const userId = props.userId || localStorage.getItem("userId");

  const [semesterData, setSemesterData] = useState([]);
  const [newSem, setNewSem] = useState("");
  const [newGrade, setNewGrade] = useState("");

  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:5000/api/semester-grades/${userId}`)
        .then((response) => response.json())
        .then((data) => setSemesterData(data))
        .catch((error) =>
          console.error("Error fetching semester grades:", error)
        );
    }
  }, [userId]);

  const handleAddSemester = async (e) => {
    e.preventDefault();
    const trimmedSem = newSem.trim();
    const gradeValue = parseFloat(newGrade);

    if (!trimmedSem || isNaN(gradeValue) || gradeValue < 0 || gradeValue > 10) {
      alert(
        `Invalid Input:\nSemester: "${trimmedSem || "None"}"\nGrade: "${
          newGrade || "None"
        }"\nPlease enter a valid semester name and a grade between 0 and 10.`
      );
      return;
    }

    // Make sure we have a valid userId before proceeding
    if (!userId) {
      alert("UserId is required. Please log in again.");
      return;
    }

    const newEntry = { sem: trimmedSem, grade: gradeValue, userId };
    try {
      const response = await fetch("http://localhost:5000/api/semester-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Error adding semester grade.");
        return;
      }

      const savedEntry = await response.json();
      setSemesterData([...semesterData, savedEntry]);
      setNewSem("");
      setNewGrade("");
    } catch (error) {
      console.error("Error adding semester grade:", error);
      alert("Server error. Please try again later.");
    }
  };

  const overallGrade =
    semesterData.length > 0
      ? semesterData.reduce((sum, item) => sum + item.grade, 0) / semesterData.length
      : 0;

  const data = {
    labels: semesterData.map((item) => item.sem),
    datasets: [
      {
        label: "Grade",
        data: semesterData.map((item) => item.grade),
        backgroundColor: "#ef4444",
        borderRadius: 10,
        barThickness: 30,
        hoverBackgroundColor: "#dc2626",
        barPercentage: 0.9,
        categoryPercentage: 0.8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `Grade: ${context.raw.toFixed(1)}`,
        },
        displayColors: false,
        backgroundColor: "#374151",
        titleFont: { weight: "bold", size: 14 },
        bodyFont: { size: 14 },
        cornerRadius: 6,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: false },
      },
      y: {
        min: 0,
        max: 10,
        ticks: { stepSize: 1 },
        grid: { color: "#e5e7eb" },
      },
    },
  };

  return (
    <div className="semester-grade-container">
      <div className="chart-section">
        <h2 className="chart-title">Semester's Grade</h2>
        <div className="chart-wrapper">
          <Bar data={data} options={options} />
        </div>
      </div>

      <div className="summary-section">
        <h3 className="summary-title">Summary</h3>
        <div className="summary-items">
          <div className="summary-item">
            <p className="summary-value">{overallGrade.toFixed(2)}</p>
            <p className="summary-label">Overall Grade</p>
          </div>
        </div>
      </div>

      <div className="add-semester-form">
        <h3>Add Semester</h3>
        <form onSubmit={handleAddSemester}>
          <input
            type="text"
            placeholder="Semester Name"
            value={newSem}
            onChange={(e) => setNewSem(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="Grade"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            required
          />
          <button type="submit">Add Semester</button>
        </form>
      </div>
    </div>
  );
};

export default SemesterGrade;




