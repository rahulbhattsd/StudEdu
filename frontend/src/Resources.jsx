import React, { useState, useEffect } from "react";
import Rating from "react-rating";
import { useDebounce } from 'use-debounce';
import "./Resources.css";

const Resource = ({ userId }) => {
  const [resources, setResources] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch] = useDebounce(searchText, 400);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploaderName, setUploaderName] = useState("");
  const [pendingRatings, setPendingRatings] = useState({});

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;


  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUploaderName(name);
  }, []);

  const safeParseJSON = async (response) => {
    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      throw new Error(`Expected JSON but got: ${text}`);
    }
  };

  const fetchResources = async () => {
    try {
      const url = `${API_BASE_URL}/api/resources?search=${encodeURIComponent(debouncedSearch)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      const data = await safeParseJSON(response);
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching resources:", err.message);
      setError("Failed to fetch resources. Please try again later.");
    }
  };

  useEffect(() => {
    fetchResources();
  }, [debouncedSearch]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return setFile(null);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please select a valid file");
    if (!uploaderName) return setError("Uploader name not found.");

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("course", course);
    formData.append("uploadedBy", userId);
    formData.append("uploadedByName", uploaderName);
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      if (!response.ok) throw new Error((await safeParseJSON(response)).message);

      setSuccess("Resource uploaded successfully!");
      setTitle("");
      setDescription("");
      setCourse("");
      setFile(null);
      fetchResources();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRatingChange = (id, rating) => {
    setPendingRatings(prev => ({ ...prev, [id]: rating }));
  };

  const submitRating = async (id) => {
    const rating = pendingRatings[id];
    if (!userId) return setError("Please log in to rate resources");
    if (rating == null) return setError("Please select a rating");

    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/${id}/rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId.toString(),
        },
        body: JSON.stringify({ rating: Number(rating.toFixed(1)) }),
      });
      if (!res.ok) throw new Error("Rating submission failed");
      setPendingRatings(prev => ({ ...prev, [id]: undefined }));
      setTimeout(fetchResources, 500);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDownload = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="resource-page">
      <h1>Study Resources</h1>

      <div className="upload-section">
        <h2>Upload Resource</h2>
        {error && <div className="error-message message"><i className="fas fa-exclamation-triangle"></i><span>{error}</span></div>}
        {fileError && <div className="error-message message"><i className="fas fa-exclamation-triangle"></i><span>{fileError}</span></div>}
        {success && <div className="success-message message"><i className="fas fa-check-circle"></i><span>{success}</span></div>}

        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="course">Course</label>
              <input type="text" id="course" value={course} onChange={e => setCourse(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)}></textarea>
          </div>

          <div className="form-group">
            <label>File Upload</label>
            <div className="file-input-wrapper">
              <input type="file" id="file" accept=".pdf,.docx" onChange={handleFileChange} required />
              <label htmlFor="file" className="file-input-label">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Choose file or drag here</span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn">
            <i className="fas fa-upload"></i>
            Upload Resource
          </button>
        </form>
      </div>

      <div className="search-section">
        <div className="search-container">
          <div className="search-icon">
            <i className="fas fa-search"></i>
          </div>
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="resource-list">
        {resources.length === 0 && <p>No resources found.</p>}
        {resources.map(resource => (
          <div key={resource.id} className="resource-item">
            <div className="resource-content">
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <div className="resource-meta">
                <strong>Course:</strong> {resource.course}
              </div>
              <button className="btn download-btn" onClick={() => handleDownload(resource.file_url)}>
                <i className="fas fa-download"></i>
                Download File
              </button>
            </div>
            <div className="rating-section">
              <div className="rating-container">
                <div className="rating-input">
                  <span className="rating-label">Rate this resource:</span>
                  <Rating
                    initialRating={pendingRatings[resource.id] ?? resource.average_rating ?? 0}
                    fractions={2}
                    emptySymbol={<i className="far fa-star star" />}
                    fullSymbol={<i className="fas fa-star star" />}
                    onChange={r => handleRatingChange(resource.id, r)}
                  />
                  <button
                    className="btn submit-rating-btn"
                    onClick={() => submitRating(resource.id)}
                    disabled={pendingRatings[resource.id] == null}
                  >
                    Submit Rating
                  </button>
                </div>
                <div className="average-rating">
                  <span className="rating-label">Average:</span>
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star star ${i < Math.round(resource.average_rating) ? "active" : ""}`}
                      ></i>
                    ))}
                  </div>
                  <span className="rating-text">
                    {resource.average_rating ? resource.average_rating.toFixed(1) : "No ratings yet"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Resource;





