import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";

const LoginSignup = ({ setCurrentUserId }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    if (isLogin && (!formData.email || !formData.password)) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    if (!isLogin && (!formData.name || !formData.email || !formData.password)) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const apiUrl =
      process.env.NODE_ENV === "production"
        ? `https://studedu.onrender.com/api/${isLogin ? "login" : "users"}`
        : `http://localhost:5000/api/${isLogin ? "login" : "users"}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        if (data.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("userName", data.user.name);
          localStorage.setItem("userLoggedIn", "true");
          setCurrentUserId(data.user.id); // ✅ This triggers <App> to rerender
        }

        navigate("/");
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Server error. Try again later.");
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="toggle-text" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "New user? Sign up" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
};

export default LoginSignup;






