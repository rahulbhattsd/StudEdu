// Sidebar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("userLoggedIn") === "true"
  );
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", icon: "dashboard" },
    { name: "Live Class", icon: "live", path: "/live" },
    { name: "Schedule", icon: "task" },
    { name: "Resources", icon: "Notes", path: "/resources" },
  ];

  if (isLoggedIn) {
    navItems.push({ name: "Logout", icon: "logout" });
  } else {
    navItems.push({ name: "Login", icon: "login", path: "/login" });
  }

  const handleNavClick = (item) => {
    setActiveItem(item.name);
    if (item.name === "Login") {
      navigate("/login");
    } else if (item.name === "Logout") {
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("userLoggedIn");
      setIsLoggedIn(false);
      navigate("/login");
    } else if (item.path) {
      navigate(item.path);
    } else {
      // Scroll into view if applicable
      const idMapping = {
        Dashboard: "dashboard-section",
        Schedule: "schedule-section",
      };
      const elementId = idMapping[item.name];
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>StudEdu</h1>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <a
                href="#"
                className={`nav-link ${
                  activeItem === item.name ? "active" : ""
                }`}
                onClick={() => handleNavClick(item)}
              >
                <span className="nav-icon material-icons">
                  {item.icon}
                </span>
                {item.name}
                {activeItem === item.name && (
                  <div className="active-marker"></div>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;










