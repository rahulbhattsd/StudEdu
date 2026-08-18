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

// Import your Supabase client (configured in database.js)
const supabase = require('./database');

// -----------------------
// Configure multer for file uploads
// -----------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
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
  origin: process.env.FRONTEND_URL || "http://localhost:5173",  // Set FRONTEND_URL in .env for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.set('trust proxy', true);
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
// Socket.io integration for scalability
// -----------------------
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory storage for active sessions
let activeSessions = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("startSession", async (sessionData) => {
    activeSessions.push(sessionData);
    io.emit("sessionUpdate", activeSessions);
    console.log("New session started:", sessionData);
  });

  socket.on("endSession", (sessionId) => {
    activeSessions = activeSessions.filter(s => s.id !== sessionId);
    io.emit("sessionUpdate", activeSessions);
    console.log("Session ended:", sessionId);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
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
    // Attempt to fetch the user from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Remove the password field before sending the user data
    delete user.password;
    res.status(200).json({
      message: "Login successful",
      user,
      redirectUrl: process.env.FRONTEND_URL || "http://localhost:5173/"
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
    const { userId, title, description, dueDate, completed, subject, topic, priority, estimatedDuration } = req.body;
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
        completed,
        subject,
        topic,
        priority,
        estimated_duration: estimatedDuration
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
    const { completed, subject, topic, priority, estimated_duration } = req.body;
    const taskId = req.params.id;
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed, subject, topic, priority, estimated_duration })
      .eq('id', taskId)
      .select('*');
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task", details: err.message });
  }
});

// STUDY SESSION Endpoints
app.post('/api/study-sessions', async (req, res) => {
  try {
    const { userId, date, hours, subjects, tasksCompleted, mocksAttempted, questionsSolved } = req.body;

    const { data: existing, error: selectErr } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (selectErr) throw selectErr;

    let resultData;
    if (existing) {
      const existingSubjects = existing.subjects || [];
      const newSubjectsInput = subjects || [];
      const mergedSubjects = Array.from(new Set([...existingSubjects, ...newSubjectsInput]));

      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          hours: Number(existing.hours || 0) + Number(hours || 0),
          tasks_completed: Number(existing.tasks_completed || 0) + Number(tasksCompleted || 0),
          mocks_attempted: Number(existing.mocks_attempted || 0) + Number(mocksAttempted || 0),
          questions_solved: Number(existing.questions_solved || 0) + Number(questionsSolved || 0),
          subjects: mergedSubjects
        })
        .eq('id', existing.id)
        .select('*');
      if (error) throw error;
      resultData = (data && data.length > 0) ? data[0] : null;
    } else {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{
          user_id: userId,
          date,
          hours: hours || 0,
          subjects: subjects || [],
          tasks_completed: tasksCompleted || 0,
          mocks_attempted: mocksAttempted || 0,
          questions_solved: questionsSolved || 0
        }])
        .select('*');
      if (error) throw error;
      resultData = (data && data.length > 0) ? data[0] : null;
    }

    res.status(200).json(resultData);
  } catch (err) {
    res.status(500).json({ error: "Failed to upsert study session", details: err.message });
  }
});

app.get('/api/study-sessions/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch study sessions", details: err.message });
  }
});

// SYLLABUS Endpoints
app.post('/api/syllabus', async (req, res) => {
  try {
    const { userId, subject, topic, sortOrder } = req.body;
    const stages = { lectures: false, notes: false, practice: false, test: false, revision1: false, revision2: false };
    const { data, error } = await supabase
      .from('syllabus_topics')
      .insert([{
        user_id: userId,
        subject,
        topic,
        sort_order: sortOrder || 0,
        stages
      }])
      .select('*');
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create syllabus topic", details: err.message });
  }
});

// Bulk-insert syllabus topics (used by frontend presets like "Load SSC CGL Syllabus").
// Skips subject+topic pairs the user already has so it's safe to click twice.
app.post('/api/syllabus/bulk', async (req, res) => {
  try {
    const { userId, topics } = req.body;
    if (!userId || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: "userId and a non-empty topics array are required" });
    }

    const { data: existing, error: existingErr } = await supabase
      .from('syllabus_topics')
      .select('subject, topic')
      .eq('user_id', userId);
    if (existingErr) throw existingErr;

    const existingKeys = new Set(
      (existing || []).map(row => `${row.subject.toLowerCase()}|${row.topic.toLowerCase()}`)
    );

    const stages = { lectures: false, notes: false, practice: false, test: false, revision1: false, revision2: false };
    const rowsToInsert = topics
      .filter(t => t.subject && t.topic && !existingKeys.has(`${t.subject.toLowerCase()}|${t.topic.toLowerCase()}`))
      .map((t, i) => ({
        user_id: userId,
        subject: t.subject,
        topic: t.topic,
        sort_order: t.sortOrder ?? i,
        stages
      }));

    if (rowsToInsert.length === 0) {
      return res.status(200).json({ inserted: 0, data: [] });
    }

    const { data, error } = await supabase
      .from('syllabus_topics')
      .insert(rowsToInsert)
      .select('*');
    if (error) throw error;

    res.status(201).json({ inserted: data.length, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk insert syllabus topics", details: err.message });
  }
});

app.get('/api/syllabus/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('syllabus_topics')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('subject', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch syllabus", details: err.message });
  }
});

app.put('/api/syllabus/:id', async (req, res) => {
  try {
    const { stages } = req.body;
    const { data, error } = await supabase
      .from('syllabus_topics')
      .update({ stages })
      .eq('id', req.params.id)
      .select('*');
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update syllabus", details: err.message });
  }
});

app.delete('/api/syllabus/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('syllabus_topics')
      .delete()
      .eq('id', req.params.id)
      .select('*');
    if (error) throw error;
    res.json(data[0] || { success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete syllabus", details: err.message });
  }
});

// MOCK TEST Endpoints
app.post('/api/mocks', async (req, res) => {
  try {
    const { userId, mockType, tier, subject, testDate, totalMarks, scoredMarks, attempted, correct, wrong, timeTakenMinutes } = req.body;
    const { data, error } = await supabase
      .from('mock_tests')
      .insert([{
        user_id: userId,
        mock_type: mockType,
        tier,
        subject,
        test_date: testDate,
        total_marks: totalMarks,
        scored_marks: scoredMarks,
        attempted,
        correct,
        wrong,
        time_taken_minutes: timeTakenMinutes
      }])
      .select('*');
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create mock test", details: err.message });
  }
});

app.get('/api/mocks/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('test_date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mocks", details: err.message });
  }
});

app.put('/api/mocks/:id', async (req, res) => {
  try {
    const { mockType, tier, subject, testDate, totalMarks, scoredMarks, attempted, correct, wrong, timeTakenMinutes } = req.body;
    const { data, error } = await supabase
      .from('mock_tests')
      .update({
        mock_type: mockType,
        tier,
        subject,
        test_date: testDate,
        total_marks: totalMarks,
        scored_marks: scoredMarks,
        attempted,
        correct,
        wrong,
        time_taken_minutes: timeTakenMinutes
      })
      .eq('id', req.params.id)
      .select('*');
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update mock test", details: err.message });
  }
});

app.delete('/api/mocks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mock_tests')
      .delete()
      .eq('id', req.params.id)
      .select('*');
    if (error) throw error;
    res.json(data[0] || { success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete mock test", details: err.message });
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

// Upload a resource
app.post("/api/resources", upload.single("file"), async (req, res) => {
  try {
    const { title, description, course, uploadedBy, uploadedByName } = req.body;
    if (!title || !course || !uploadedBy || !uploadedByName) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".pdf", ".docx"].includes(ext)) {
      return res.status(400).json({ message: "Only .pdf and .docx allowed" });
    }

    // ✅ Build file URL dynamically (production-safe)
    const baseUrl =
      process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    // Insert into Supabase
    const { data, error } = await supabase
      .from("resources")
      .insert({
        title,
        description,
        course,
        file_url: fileUrl,
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
        average_rating: 0,
      })
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Upload error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large (max 3MB)" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch/search resources
app.get("/api/resources", async (req, res) => {
  try {
    const { search } = req.query;
    let qb = supabase.from("resources").select("*");
    if (search) {
      qb = qb.or(`title.ilike.%${search}%,course.ilike.%${search}%`);
    }
    const { data, error } = await qb;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

// Rate a resource
app.put("/api/resources/:id/rate", async (req, res) => {
  try {
    const resourceId = req.params.id;
    const { rating } = req.body;
    const userId = req.headers["x-user-id"];

    if (!userId) return res.status(401).json({ message: "User ID required" });
    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 0–5" });
    }

    // Upsert individual rating
    const { error: upsertErr } = await supabase
      .from("resource_ratings")
      .upsert(
        { resource_id: resourceId, user_id: userId, rating },
        { onConflict: ["resource_id", "user_id"] }
      );
    if (upsertErr) throw upsertErr;

    // Recalculate average
    const { data: allRatings, error: getErr } = await supabase
      .from("resource_ratings")
      .select("rating")
      .eq("resource_id", resourceId);
    if (getErr) throw getErr;

    const sum = allRatings.reduce((s, r) => s + r.rating, 0);
    const avg = Number((sum / allRatings.length).toFixed(1));

    const { error: updErr } = await supabase
      .from("resources")
      .update({ average_rating: avg })
      .eq("id", resourceId);
    if (updErr) throw updErr;

    res.json({ success: true, averageRating: avg });
  } catch (err) {
    console.error("Rating error:", err);
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
// Serve static frontend files from "public"
// -----------------------
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for client-side routing (handles all methods including HEAD)
app.all(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------------
// Start HTTP Server with Socket.io
// -----------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

