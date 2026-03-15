const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { testConnection } = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const userRoutes = require("./routes/users");
const socialRoutes = require("./routes/social");
const eventRoutes = require("./routes/events");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Serve static files (HTML, CSS, images)
app.use(express.static(__dirname));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/users", userRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "not-found.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error(
      "Failed to connect to database. Please check your configuration."
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n Watchly Server is running!`);
    console.log(` Local: http://localhost:${PORT}`);
    console.log(` Database: ${process.env.DB_NAME}`);
    console.log(`\n Ready to serve movie magic!\n`);
  });
};

startServer();
