# StudEdu 🎓

StudEdu is an innovative platform designed for **goal tracking**, **resource sharing**, and **collaboration** among students.  
Built using **React.js**, **JavaScript**, **Express**,  and **Supabase**, it empowers learners to achieve more together.

---

## 🌟 Live Demo

<!-- Add your deployment link here if available -->
(https://studedu.onrender.com)

---

## 📦 Tech Stack

- **Frontend:** React.js, JavaScript
- **Backend:** Express.js, Node.js
- **Database:** MongoDB, Supabase
- **Realtime:** WebSocket (for live collaboration & streaming)
- **Other:** REST API, MVC architecture

---

## 🗂️ Project Structure

```
StudEdu/
│
├── frontend/        # React.js client application
├── public/          # Static assets (images, favicon, etc.)
├── .gitignore       # Git ignored files
├── README.md        # Project documentation
├── database.js      # MongoDB/Supabase connection setup
├── package.json     # Project metadata and dependencies
├── package-lock.json# Dependency lock file
├── server.js        # Main Express server application
```

---

## 🚀 Features

- **Goal Tracking:** Set, manage, and monitor personal and group goals.
- **Resource Sharing:** Upload, download, and share notes, documents, and links.
- **Collaboration:** Chat, comment, and work together in groups and projects.
- **Live Streaming:** Use WebSocket for real-time collaboration and live sessions (like Zoom).
- **User Profiles:** Personalized dashboards and progress tracking.
- **Notifications:** Stay updated with important events and deadlines.
- **Responsive Design:** Optimized for mobile and desktop use.

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Supabase](https://supabase.com/)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rahulbhattsd/StudEdu.git
   cd StudEdu
   ```
2. **Install dependencies:**
   ```bash
   npm install
   cd frontend
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the root directory.
   - Add your MongoDB and Supabase credentials:
     ```
     MONGODB_URI=your_mongodb_connection_string
     SUPABASE_URL=your_supabase_url
     SUPABASE_KEY=your_supabase_key
     ```
4. **Start MongoDB locally or use a cloud provider.**

5. **Run the backend server:**
   ```bash
   npm start
   ```
6. **Run the frontend (React app):**
   ```bash
   cd frontend
   npm start
   ```
7. **Visit:**  
   - Backend API: `http://localhost:5000`
   - Frontend app: `http://localhost:3000`

---

## 📝 Usage Instructions

1. **Sign Up / Log In:** Create your student account.
2. **Set Goals:** Add short-term and long-term goals.
3. **Share Resources:** Upload files, share links, and organize study materials.
4. **Collaborate:** Join groups, participate in chats, and work on shared projects.
5. **Live Sessions:** Start or join live streams for group studies or presentations.
6. **Track Progress:** Monitor your achievements and receive notifications.
7. **Customize Profile:** Update personal info and manage your dashboard.

---

## 🧩 Folder-by-Folder Guide

- **frontend/**: All React UI code, components, pages, and assets.
- **public/**: Static files for frontend and backend.
- **database.js**: MongoDB/Supabase database configuration and connection.
- **server.js**: Express API endpoints, WebSocket setup for live features.

---

## 📚 Useful Commands

- `npm start` – Start the backend server
- `npm run dev` – Start backend with nodemon (if configured)
- `cd frontend && npm start` – Start React frontend
- `npm install` – Install dependencies

---

## 🏗️ Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Make your changes
4. Commit and push (`git commit -am 'Add feature'`)
5. Open a Pull Request

---

## ❓ FAQ

- **How do I join a group or live session?**  
  Use the dashboard or group pages to discover and join active groups/sessions.

- **Can I use StudEdu for my school or institution?**  
  Yes! Contact the maintainer for institutional setup or customization.

- **Where can I get support?**  
  Open an issue in this repo or contact [rahulbhattsd](https://github.com/rahulbhattsd).

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Credits

Developed by [Rahul Bhatt](https://github.com/rahulbhattsd).

---

