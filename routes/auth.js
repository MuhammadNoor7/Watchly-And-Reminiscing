const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { promisePool } = require("../config/database");

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user from database
    const [users] = await promisePool.query(
      "SELECT * FROM User WHERE email = ? AND user_type = ?",
      [email, "general"]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // For demo purposes, using plain text password comparison
    // In production, use bcrypt.compare(password, user.password)
    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Store user in session
    req.session.userId = user.user_id;
    req.session.userName = user.name;
    req.session.userType = user.user_type;

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Admin Login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get admin user from database
    const [users] = await promisePool.query(
      "SELECT * FROM User WHERE email = ? AND user_type = ?",
      [email, "admin"]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const user = users[0];

    // For demo purposes, using plain text password comparison
    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    // Store admin in session
    req.session.userId = user.user_id;
    req.session.userName = user.name;
    req.session.userType = user.user_type;

    res.json({
      message: "Admin login successful",
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Server error during admin login" });
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Password validation: at least 8 characters and at least one special character
    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters long" 
      });
    }

    // Check for special characters
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/;
    if (!specialCharRegex.test(password)) {
      return res.status(400).json({ 
        error: "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:',.<>?)" 
      });
    }

    // Check if user already exists
    const [existingUsers] = await promisePool.query(
      "SELECT * FROM User WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Insert new user (using plain text for demo - in production use bcrypt)
    const [result] = await promisePool.query(
      "INSERT INTO User (name, email, password, user_type) VALUES (?, ?, ?, ?)",
      [name, email, password, "general"]
    );

    res.status(201).json({
      message: "Registration successful",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.json({ message: "Logout successful" });
  });
});

// Check session
router.get("/check-session", (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        type: req.session.userType,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;