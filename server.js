// -----------------------
// Import dependencies
// -----------------------
const express = require('express');           // Express for server creation
const cors = require('cors');                 // Enables CORS for our API
const bcrypt = require('bcryptjs');           // Password hashing and comparison
const morgan = require('morgan');             // HTTP request logger middleware
require('dotenv').config();                   // Load environment variables from .env

const path = require('path');                 // Node.js path module (built-in)
const fs = require('fs');                     // File system module (built-in)
const multer = require('multer');             // Middleware for handling file uploads

// Import your Supabase client (configured in database.js, now at project root)
const supabase = require('./database');

// -----------------------
// Configure multer for file uploads
// -----------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Creates or reuses the uploads folder at project root
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedFilename = file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedFilename);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB file size limit
});

// -----------------------
// Initialize Express app
// -----------------------
const app = express();

// -----------------------
// Configure CORS
// -----------------------
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",  // Set production frontend URL in .env (e.g., FRONTEND_URL=https://your-frontend-url.com)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// -----------------------
// Logging and Body Parsing Middleware
// -----------------------
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------
// Serve static files from the "uploads" folder
// -----------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------
// Dummy Authentication Middleware
// -----------------------
app.use((req, res, next) => {
  // Set a default user if "x-user-id" header is not provided
  req.user = { id: req.headers["x-user-id"] || "00000000-0000-0000-0000-000000000000" };
  next();
});

// -----------------------
// API Endpoints
// -----------------------

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Authentication Endpoint - Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    delete user.password;
    res.status(200).json({
      message: "Login successful",
      user,
      redirectUrl: process.env.FRONTEND_URL || "http://localhost:5173/" // Update as needed for production
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message })
    });
  }
});

// Authentication Endpoint - User Registration
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword }])
      .select();
    if (error) throw error;
    const userResponse = newUser[0];
    delete userResponse.password;
    res.status(201).json({
      message: "User registered successfully",
      user: userResponse
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// TASK Endpoints
app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, dueDate, completed } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ error: "UserId and title are required" });
    }
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
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task", details: err.message });
  }
});

app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { completed } = req.body;
    const taskId = req.params.id;
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', taskId)
      .select('*');
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task", details: err.message });
  }
});

// USER Endpoints
app.get("/api/users/:id", async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// EVENT Endpoints
app.post('/api/events', async (req, res) => {
  try {
    const { userId, title, start, end, description } = req.body;
    if (!userId || !title || !start) {
      return res.status(400).json({ error: "UserId, title, and start time are required" });
    }
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
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to create event",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.get('/api/events/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to fetch events",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// SEMESTER GRADE Endpoints
app.post('/api/semester-grades', async (req, res) => {
  try {
    const { userId, sem, grade } = req.body;
    if (!userId || !sem || grade === undefined) {
      return res.status(400).json({ error: "UserId, semester name, and grade are required" });
    }
    if (grade < 0 || grade > 10) {
      return res.status(400).json({ error: "Grade must be between 0 and 10" });
    }
    const { data, error } = await supabase
      .from('semester_grades')
      .insert([{ 
        user_id: userId, 
        sem, 
        grade 
      }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
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
    const { data, error } = await supabase
      .from('semester_grades')
      .select('*')
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching semester grades:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// RESOURCE Endpoints
app.post("/api/resources", upload.single("file"), async (req, res) => {
  try {
    const { title, description, course, uploadedBy, uploadedByName } = req.body;
    const file = req.file;
    if (!title || !course || !uploadedBy || !uploadedByName)
      return res.status(400).json({ message: "Title, course, uploadedBy, and uploadedByName are required" });
    if (!file)
      return res.status(400).json({ message: "File is required" });
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".docx"].includes(ext))
      return res.status(400).json({ message: "Only .pdf and .docx files are allowed" });
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
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
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ message: "File size exceeds 3MB limit" });
    console.error("Server error in resource upload:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/resources", async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase.from("resources").select("*");
    if (search)
      query = query.or(`title.ilike.%${search}%,course.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

app.put("/api/resources/:id/rate", async (req, res) => {
  try {
    const resourceId = req.params.id;
    const { rating } = req.body;
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 0 and 5" });
    }
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
    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return res.status(400).json({ message: "Error updating rating" });
    }
    const { data: ratings, error: ratingsError } = await supabase
      .from("resource_ratings")
      .select("rating")
      .eq("resource_id", resourceId);
    if (ratingsError) throw ratingsError;
    const avg = ratings.reduce((acc, row) => acc + row.rating, 0) / ratings.length;
    const { error: updateError } = await supabase
      .from("resources")
      .update({ average_rating: avg })
      .eq("id", resourceId);
    if (updateError) throw updateError;
    res.json({ success: true, averageRating: avg.toFixed(1) });
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ message: "Error updating rating" });
  }
});

// -----------------------
// Global Error Handling Middleware
// -----------------------
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// -----------------------
// Start Server for Render Deployment
// -----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

