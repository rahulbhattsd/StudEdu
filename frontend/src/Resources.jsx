import React, { useState, useEffect } from "react";
import Rating from "react-rating";
import "./Resources.css";

const Resource = ({ userId }) => {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploaderName, setUploaderName] = useState("");
  // Store new ratings temporarily before submitting
  const [pendingRatings, setPendingRatings] = useState({});

  // Retrieve uploader name from localStorage on mount
  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUploaderName(name);
  }, []);

  // Helper to safely parse JSON responses
  const safeParseJSON = async (response) => {
    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      throw new Error(`Expected JSON but got: ${text}`);
    }
  };

  // Fetch resources from the backend
  const fetchResources = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/resources?search=${encodeURIComponent(search)}`
      );
      if (!response.ok) {
        throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
      }
      const data = await safeParseJSON(response);
      setResources(data);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [search]);

  // Handle file selection with validation
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop().toLowerCase();
      if (selectedFile.size > 3 * 1024 * 1024) {
        setFileError("File size exceeds 3MB limit");
        setFile(null);
      } else if (!["pdf", "docx"].includes(extension)) {
        setFileError("Only .pdf and .docx files are allowed");
        setFile(null);
      } else {
        setFileError(null);
        setFile(selectedFile);
      }
    } else {
      setFileError(null);
      setFile(null);
    }
  };

  // Handle resource upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a valid file");
      return;
    }
    setError(null);
    setSuccess(null);

    if (!uploaderName) {
      setError("Uploader name not found. Please log in properly.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("course", course);
    formData.append("uploadedBy", userId);
    formData.append("uploadedByName", uploaderName);
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/api/resources", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.message || "Failed to upload resource");
      }

      setSuccess("Resource uploaded successfully!");
      setTitle("");
      setDescription("");
      setCourse("");
      setFile(null);
      await fetchResources();
    } catch (err) {
      console.error("Error uploading resource:", err);
      setError(err.message);
    }
  };

  // Handle rating change: store the new rating in pendingRatings state
  const handleRatingChange = (resourceId, newRating) => {
    setPendingRatings((prev) => ({
      ...prev,
      [resourceId]: newRating,
    }));
  };

  const submitRating = async (resourceId) => {
    try {
      if (!userId) {
        setError("Please log in to rate resources");
        return;
      }
  
      const ratingValue = pendingRatings[resourceId];
      if (typeof ratingValue === "undefined") {
        setError("Please select a rating before submitting");
        return;
      }
  
      console.log("Submitting rating:", { resourceId, userId, rating: ratingValue });
  
      const response = await fetch(`http://localhost:5000/api/resources/${resourceId}/rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId.toString(),
        },
        body: JSON.stringify({ rating: Number(parseFloat(ratingValue).toFixed(1)) }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
  
      console.log("Rating submitted successfully");
  
      setPendingRatings((prev) => ({ ...prev, [resourceId]: undefined }));
      await fetchResources();
    } catch (err) {
      console.error("Rating submission error:", err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };
  

  // Trigger file download by fetching as blob and creating a temporary link
  const handleDownload = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileUrl.split("/").pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Error downloading file");
    }
  };

  return (
    <div className="resource-page">
      <h1>Study Resources</h1>

      {/* Upload Form */}
      <div className="upload-section">
        <h2>Upload Resource</h2>
        {error && <div className="error-message">{error}</div>}
        {fileError && <div className="error-message">{fileError}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Course:</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>File:</label>
            <input type="file" onChange={handleFileChange} required />
          </div>
          <button type="submit" className="btn" disabled={!file}>
            Upload
          </button>
        </form>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by title or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Resource List */}
      <div className="resource-list">
        {resources.length === 0 && <p>No resources found.</p>}
        {resources.map((resource) => (
          <div key={resource.id} className="resource-item">
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <p>
              <strong>Course:</strong> {resource.course}
            </p>
            <button
              className="btn download-btn"
              onClick={() => handleDownload(resource.file_url)}
            >
              Download File
            </button>
            <div className="rating-section">
              <label>Rate:</label>
              <Rating
                initialRating={
                  pendingRatings[resource.id] !== undefined
                    ? pendingRatings[resource.id]
                    : resource.average_rating || 0
                }
                fractions={2}
                emptySymbol={
                  <i className="far fa-star" style={{ color: "#ffd700", fontSize: "24px" }} />
                }
                fullSymbol={
                  <i className="fas fa-star" style={{ color: "#ffd700", fontSize: "24px" }} />
                }
                onChange={(newRating) => handleRatingChange(resource.id, newRating)}
              />
              <button
                className="btn submit-rating-btn"
                onClick={() => submitRating(resource.id)}
                disabled={
                  pendingRatings[resource.id] === undefined ||
                  pendingRatings[resource.id] === null
                }
              >
                Submit Rating
              </button>
              <p>
                Average Rating:{" "}
                {resource.average_rating !== null &&
                resource.average_rating !== undefined
                  ? Number(resource.average_rating).toFixed(1)
                  : "No ratings yet"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Resource;

