// Import Express framework
const express = require('express'); // Express for server creation
// Import CORS for cross-origin resource sharing
const cors = require('cors'); // Enables CORS for our API
// Import bcrypt for password hashing
const bcrypt = require("bcryptjs"); // Password hashing and comparison
// Import morgan for logging HTTP requests
const morgan = require('morgan'); // HTTP request logger middleware
// Load environment variables from .env file
require('dotenv').config(); // Load env variables

// Import path and fs for file and directory operations
const path = require('path'); // Node.js path module
const fs = require('fs'); // File system module
// Import Supabase client from local file (database.js)
const supabase = require('./database'); // Supabase client for DB operations
// Import multer for handling file uploads
const multer = require('multer'); // Middleware for handling multipart/form-data

// Set up multer disk storage for local file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) { // Define destination for uploaded files
    const uploadPath = path.join(__dirname, 'uploads'); // Construct upload directory path
    if (!fs.existsSync(uploadPath)) { // Check if the directory exists
      fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if it doesn't exist
    }
    cb(null, uploadPath); // Callback with the upload path
  },
  filename: function (req, file, cb) { // Define filename for uploaded files
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Create a unique suffix
    const sanitizedFilename = file.originalname.replace(/\s+/g, '_'); // Replace spaces with underscores
    cb(null, uniqueSuffix + '-' + sanitizedFilename); // Callback with unique filename
  }
});
const upload = multer({
  storage: storage, // Use defined storage configuration
  limits: { fileSize: 3 * 1024 * 1024 } // Set file size limit to 3MB
});

// Create an Express application instance
const app = express(); // Initialize Express app

// -----------------------
// Set up HTTP server and Socket.io integration for real-time updates
// -----------------------
const http = require('http'); // Import Node.js HTTP module
const { Server } = require('socket.io'); // Import Socket.io server class
const server = http.createServer(app); // Create HTTP server using Express app
const io = new Server(server, { // Initialize Socket.io with CORS settings
  cors: {
    origin: "http://localhost:5173", // Allow requests from frontend URL
    methods: ["GET", "POST"], // Allowed HTTP methods for Socket.io
    credentials: true, // Allow credentials (cookies, etc.)
  },
});

// -----------------------
// Configure Enhanced CORS for Express
// -----------------------
const corsOptions = {
  origin: "http://localhost:5173", // Allowed origin for API requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow credentials
  optionsSuccessStatus: 200 // HTTP status for successful OPTIONS requests
};
app.use(cors(corsOptions)); // Use CORS middleware with defined options
app.options('*', cors(corsOptions)); // Enable pre-flight across the board

// -----------------------
// Logging and Body Parsing Middleware
// -----------------------
app.use(morgan('dev')); // Log incoming HTTP requests in dev format
app.use(express.json()); // Parse JSON bodies for incoming requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// -----------------------
// Serve static files from the uploads folder with CORS enabled
// -----------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files in uploads folder

// -----------------------
// Dummy Authentication Middleware
// Ensures req.user is set for subsequent endpoints based on header "x-user-id"
app.use((req, res, next) => {
  req.user = { id: req.headers["x-user-id"] || "00000000-0000-0000-0000-000000000000" }; // Set default user ID if header is missing
  next(); // Move to next middleware or route handler
});

// -----------------------
// Real-time Session Management using WebSockets (Socket.io)
// -----------------------

// In-memory storage for active sessions
let activeSessions = []; // Array to store active session objects

// Handle new Socket.io connections
io.on("connection", (socket) => { // When a new client connects via Socket.io
  console.log(`User connected: ${socket.id}`); // Log when a user connects

  // Listen for a new session being started
  socket.on("startSession", async (sessionData) => { // When a client starts a session
    activeSessions.push(sessionData); // Add new session to active sessions
    io.emit("sessionUpdate", activeSessions); // Broadcast updated sessions to all clients
    console.log("New session started:", sessionData); // Log session data
  });

  // Listen for a session being ended
  socket.on("endSession", (sessionId) => { // When a client ends a session
    activeSessions = activeSessions.filter((s) => s.id !== sessionId); // Remove session from active sessions
    io.emit("sessionUpdate", activeSessions); // Broadcast updated sessions to all clients
    console.log("Session ended:", sessionId); // Log session end
  });

  // Log when a user disconnects
  socket.on("disconnect", () => { // When a client disconnects
    console.log(`User disconnected: ${socket.id}`); // Log disconnection
  });
});

// -----------------------
// API Endpoints
// -----------------------

// Health check endpoint to verify server status
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() }); // Return server health and timestamp
});

// -----------------------
// Authentication Endpoints (Without JWT)
// -----------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body; // Destructure email and password from request body
    if (!email || !password) { // Check if both fields are provided
      return res.status(400).json({ error: "Email and password are required" }); // Return error if missing
    }
    // Query Supabase for the user with the given email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !user) { // Check if user was found
      return res.status(401).json({ error: "Invalid credentials" }); // Return error if not
    }
    // Compare provided password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) { // If passwords don't match, return error
      return res.status(401).json({ error: "Invalid credentials" });
    }
    delete user.password; // Remove password from user object for security
    // Return success response with user details and redirect URL
    res.status(200).json({
      message: "Login successful",
      user,
      redirectUrl: "http://localhost:5173/" // Client-side redirection URL
    });
  } catch (err) {
    console.error("Login error:", err); // Log error
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message }) // Include error details in development
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body; // Destructure user data from request body
    if (!name || !email || !password) { // Validate input
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 8) { // Check password length
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (existingUser) { // If user exists, return error
      return res.status(409).json({ error: "Email already in use" });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    // Insert new user into Supabase
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword }])
      .select();
    if (error) throw error; // Throw error if insertion fails
    const userResponse = newUser[0]; // Get the newly created user
    delete userResponse.password; // Remove password for security
    // Return success response with new user data
    res.status(201).json({
      message: "User registered successfully",
      user: userResponse
    });
  } catch (err) {
    console.error("Signup error:", err); // Log error
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// -----------------------
// TASK ENDPOINTS
// -----------------------
app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, dueDate, completed } = req.body; // Destructure task details from request body
    if (!userId || !title) { // Validate required fields
      return res.status(400).json({ error: "UserId and title are required" });
    }
    // Insert new task into Supabase
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        user_id: userId, 
        title, 
        description, 
        due_date: dueDate, 
        completed 
      }])
      .select();
    if (error) throw error; // Throw error if insertion fails
    res.status(201).json(data[0]); // Return the created task
  } catch (err) {
    res.status(500).json({ error: "Failed to create task", details: err.message });
  }
});

app.get('/api/tasks/:userId', async (req, res) => {
  try {
    // Retrieve tasks for a specific user from Supabase
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error; // Throw error if query fails
    // Set headers to disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(data); // Return tasks data
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { completed } = req.body; // Get completed status from request body
    const taskId = req.params.id; // Get task ID from route parameter
    // Update task's completed status in Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', taskId)
      .select('*');
    if (error) throw error; // Throw error if update fails
    res.json(data[0]); // Return updated task
  } catch (err) {
    res.status(500).json({ error: "Failed to update task", details: err.message });
  }
});

// -----------------------
// USER ENDPOINTS
// -----------------------
app.get("/api/users/:id", async (req, res) => {
  try {
    // Retrieve a specific user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !user) { // If user not found, return error
      return res.status(404).json({ error: "User not found" });
    }
    delete user.password; // Remove password for security
    res.json(user); // Return user data
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// -----------------------
// EVENT ENDPOINTS
// -----------------------
app.post('/api/events', async (req, res) => {
  try {
    const { userId, title, start, end, description } = req.body; // Destructure event details
    if (!userId || !title || !start) { // Validate required fields
      return res.status(400).json({ error: "UserId, title, and start time are required" });
    }
    // Insert new event into Supabase
    const { data, error } = await supabase
      .from('events')
      .insert([{ 
        user_id: userId, 
        title, 
        start, 
        end, 
        description 
      }])
      .select();
    if (error) throw error; // Throw error if insertion fails
    res.status(201).json(data[0]); // Return the created event
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to create event",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.get('/api/events/:userId', async (req, res) => {
  try {
    // Retrieve events for a specific user from Supabase
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error; // Throw error if query fails
    res.json(data); // Return events data
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to fetch events",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// -----------------------
// SEMESTER GRADE ENDPOINTS
// -----------------------
app.post('/api/semester-grades', async (req, res) => {
  try {
    const { userId, sem, grade } = req.body; // Destructure semester grade details
    if (!userId || !sem || grade === undefined) { // Validate required fields
      return res.status(400).json({ error: "UserId, semester name, and grade are required" });
    }
    if (grade < 0 || grade > 10) { // Check if grade is within acceptable range
      return res.status(400).json({ error: "Grade must be between 0 and 10" });
    }
    // Insert semester grade into Supabase
    const { data, error } = await supabase
      .from('semester_grades')
      .insert([{ 
        user_id: userId, 
        sem, 
        grade 
      }])
      .select();
    if (error) throw error; // Throw error if insertion fails
    res.status(201).json(data[0]); // Return the created semester grade
  } catch (err) {
    console.error("Error creating semester grade:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.get('/api/semester-grades/:userId', async (req, res) => {
  try {
    // Retrieve semester grades for a specific user from Supabase
    const { data, error } = await supabase
      .from('semester_grades')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error; // Throw error if query fails
    res.json(data); // Return semester grades data
  } catch (err) {
    console.error("Error fetching semester grades:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// -----------------------
// RESOURCE ENDPOINTS (Without Cloudinary)
// -----------------------
app.post("/api/resources", upload.single("file"), async (req, res) => {
  try {
    // Destructure resource details from request body
    const { title, description, course, uploadedBy, uploadedByName } = req.body;
    const file = req.file; // Get the uploaded file
    if (!title || !course || !uploadedBy || !uploadedByName) // Validate required fields
      return res.status(400).json({ message: "Title, course, uploadedBy, and uploadedByName are required" });
    if (!file) // Ensure file is uploaded
      return res.status(400).json({ message: "File is required" });
    const ext = path.extname(file.originalname).toLowerCase(); // Get file extension
    if (![".pdf", ".docx"].includes(ext)) // Validate file type
      return res.status(400).json({ message: "Only .pdf and .docx files are allowed" });
    // Build the file URL from the current request
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    // Insert resource data into Supabase
    const { data, error } = await supabase
      .from("resources")
      .insert({
        title,
        description,
        course,
        file_url: fileUrl,
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
        average_rating: 0
      })
      .select();
    if (error) throw error; // Throw error if insertion fails
    res.status(201).json(data[0]); // Return the created resource
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") // Check for file size limit error
      return res.status(400).json({ message: "File size exceeds 3MB limit" });
    console.error("Server error in resource upload:", error); // Log error
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/resources", async (req, res) => {
  try {
    const { search } = req.query; // Get search query parameter if provided
    let query = supabase.from("resources").select("*"); // Start query for resources
    if (search) // If search parameter exists, add filter condition
      query = query.or(`title.ilike.%${search}%,course.ilike.%${search}%`);
    const { data, error } = await query; // Execute the query
    if (error) throw error; // Throw error if query fails
    res.json(data); // Return resources data
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

app.put("/api/resources/:id/rate", async (req, res) => {
  try {
    const resourceId = req.params.id; // Get resource ID from route parameter
    const { rating } = req.body; // Get rating from request body
    const userId = req.headers["x-user-id"]; // Get user ID from headers
    if (!userId) { // Ensure user ID is provided
      return res.status(401).json({ message: "User ID required" });
    }
    if (typeof rating !== 'number' || rating < 0 || rating > 5) { // Validate rating value
      return res.status(400).json({ message: "Rating must be between 0 and 5" });
    }
    // Upsert rating into resource_ratings table in Supabase
    const { error: upsertError } = await supabase
      .from("resource_ratings")
      .upsert(
        {
          resource_id: resourceId,
          user_id: userId,
          rating
        },
        { onConflict: ["resource_id", "user_id"] }
      );
    if (upsertError) { // If upsert fails, log error and return response
      console.error("Upsert error:", upsertError);
      return res.status(400).json({ message: "Error updating rating" });
    }
    // Fetch all ratings for the resource
    const { data: ratings, error: ratingsError } = await supabase
      .from("resource_ratings")
      .select("rating")
      .eq("resource_id", resourceId);
    if (ratingsError) throw ratingsError; // Throw error if query fails
    // Calculate average rating
    const avg = ratings.reduce((acc, row) => acc + row.rating, 0) / ratings.length;
    // Update the resource with the new average rating
    const { error: updateError } = await supabase
      .from("resources")
      .update({ average_rating: avg })
      .eq("id", resourceId);
    if (updateError) throw updateError; // Throw error if update fails
    res.json({ success: true, averageRating: avg.toFixed(1) }); // Return success response with new average
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ message: "Error updating rating" });
  }
});

// -----------------------
// GLOBAL ERROR HANDLING
// -----------------------
app.use((err, req, res, next) => {
  console.error('Global error handler:', err); // Log global errors
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }) // Provide error details in development
  });
});

// -----------------------
// START THE SERVER
// -----------------------
const PORT = process.env.PORT || 5000; // Set server port from environment or default to 5000
server.listen(PORT, () => { // Start HTTP server (with Socket.io) instead of app.listen
  console.log(`Server is running on port ${PORT}`); // Log server startup
});


