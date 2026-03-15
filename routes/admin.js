const express = require("express");
const router = express.Router();
const { promisePool } = require("../config/database");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.userType !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// Log admin action
const logAdminAction = async (
  adminId,
  operation,
  targetTable,
  targetId,
  details
) => {
  try {
    await promisePool.query(
      "INSERT INTO AuditLog (admin_id, operation, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)",
      [adminId, operation, targetTable, targetId, details]
    );
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

// Get dashboard stats
router.get("/dashboard", async (req, res) => {
  try {
    const [stats] = await promisePool.query(`
            SELECT 
                (SELECT COUNT(*) FROM User WHERE user_type = 'general') as total_users,
                (SELECT COUNT(*) FROM Movie) as total_movies,
                (SELECT COUNT(*) FROM Post) as total_posts,
                (SELECT COUNT(*) FROM Event) as total_events,
                (SELECT COUNT(*) FROM Review) as total_reviews
        `);

    res.json(stats[0]);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const [users] = await promisePool.query(`
            SELECT user_id, name, email, registration_date, user_type
            FROM User
            ORDER BY registration_date DESC
        `);

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const adminId = req.session.userId;

    await promisePool.query("DELETE FROM User WHERE user_id = ?", [userId]);
    await logAdminAction(
      adminId,
      "DELETE",
      "User",
      userId,
      "Deleted user account"
    );

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Get all movies
router.get("/movies", async (req, res) => {
  try {
    const [movies] = await promisePool.query(`
            SELECT m.*,
                   GROUP_CONCAT(g.name) as genres
            FROM Movie m
            LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
            GROUP BY m.movie_id
            ORDER BY m.release_year DESC
        `);

    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// Add movie
router.post("/movies", async (req, res) => {
  try {
    const { title, synopsis, release_year, poster_image, genres } = req.body;
    const adminId = req.session.userId;

    if (!title || !release_year) {
      return res
        .status(400)
        .json({ error: "Title and release year are required" });
    }

    const [result] = await promisePool.query(
      "INSERT INTO Movie (title, synopsis, release_year, poster_image) VALUES (?, ?, ?, ?)",
      [title, synopsis, release_year, poster_image]
    );

    const movieId = result.insertId;

    // Add genres if provided
    if (genres && genres.length > 0) {
      for (const genreId of genres) {
        await promisePool.query(
          "INSERT INTO MovieGenre (movie_id, genre_id) VALUES (?, ?)",
          [movieId, genreId]
        );
      }
    }

    await logAdminAction(
      adminId,
      "INSERT",
      "Movie",
      movieId,
      `Added movie: ${title}`
    );

    res.status(201).json({
      message: "Movie added successfully",
      movieId,
    });
  } catch (error) {
    console.error("Error adding movie:", error);
    res.status(500).json({ error: "Failed to add movie" });
  }
});

// Update movie
router.put("/movies/:id", async (req, res) => {
  try {
    const movieId = req.params.id;
    const { title, synopsis, release_year, poster_image } = req.body;
    const adminId = req.session.userId;

    await promisePool.query(
      "UPDATE Movie SET title = ?, synopsis = ?, release_year = ?, poster_image = ? WHERE movie_id = ?",
      [title, synopsis, release_year, poster_image, movieId]
    );

    await logAdminAction(
      adminId,
      "UPDATE",
      "Movie",
      movieId,
      `Updated movie: ${title}`
    );

    res.json({ message: "Movie updated successfully" });
  } catch (error) {
    console.error("Error updating movie:", error);
    res.status(500).json({ error: "Failed to update movie" });
  }
});

// Delete movie
router.delete("/movies/:id", async (req, res) => {
  try {
    const movieId = req.params.id;
    const adminId = req.session.userId;

    await promisePool.query("DELETE FROM Movie WHERE movie_id = ?", [movieId]);
    await logAdminAction(adminId, "DELETE", "Movie", movieId, "Deleted movie");

    res.json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error("Error deleting movie:", error);
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

// Get all genres
router.get("/genres", async (req, res) => {
  try {
    const [genres] = await promisePool.query(
      "SELECT * FROM Genre ORDER BY name"
    );
    res.json(genres);
  } catch (error) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});

// Add genre
router.post("/genres", async (req, res) => {
  try {
    const { name, description } = req.body;
    const adminId = req.session.userId;

    if (!name) {
      return res.status(400).json({ error: "Genre name is required" });
    }

    const [result] = await promisePool.query(
      "INSERT INTO Genre (name, description) VALUES (?, ?)",
      [name, description]
    );

    await logAdminAction(
      adminId,
      "INSERT",
      "Genre",
      result.insertId,
      `Added genre: ${name}`
    );

    res.status(201).json({
      message: "Genre added successfully",
      genreId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding genre:", error);
    res.status(500).json({ error: "Failed to add genre" });
  }
});

// Update genre
router.put("/genres/:id", async (req, res) => {
  try {
    const genreId = req.params.id;
    const { name, description } = req.body;
    const adminId = req.session.userId;

    await promisePool.query(
      "UPDATE Genre SET name = ?, description = ? WHERE genre_id = ?",
      [name, description, genreId]
    );

    await logAdminAction(
      adminId,
      "UPDATE",
      "Genre",
      genreId,
      `Updated genre: ${name}`
    );

    res.json({ message: "Genre updated successfully" });
  } catch (error) {
    console.error("Error updating genre:", error);
    res.status(500).json({ error: "Failed to update genre" });
  }
});

// Delete genre
router.delete("/genres/:id", async (req, res) => {
  try {
    const genreId = req.params.id;
    const adminId = req.session.userId;

    await promisePool.query("DELETE FROM Genre WHERE genre_id = ?", [genreId]);
    await logAdminAction(adminId, "DELETE", "Genre", genreId, "Deleted genre");

    res.json({ message: "Genre deleted successfully" });
  } catch (error) {
    console.error("Error deleting genre:", error);
    res.status(500).json({ error: "Failed to delete genre" });
  }
});

// Get all posts
router.get("/posts", async (req, res) => {
  try {
    const [posts] = await promisePool.query(`
            SELECT p.*, u.name as user_name, m.title as movie_title
            FROM Post p
            JOIN User u ON p.user_id = u.user_id
            JOIN Movie m ON p.movie_id = m.movie_id
            ORDER BY p.post_date DESC
        `);

    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Delete post
router.delete("/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const adminId = req.session.userId;

    await promisePool.query("DELETE FROM Post WHERE post_id = ?", [postId]);
    await logAdminAction(adminId, "DELETE", "Post", postId, "Deleted post");

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Get restricted words
router.get("/restricted-words", async (req, res) => {
  try {
    const [words] = await promisePool.query(`
            SELECT rw.*, u.name as added_by_name
            FROM RestrictedWord rw
            LEFT JOIN User u ON rw.added_by = u.user_id
            ORDER BY rw.word
        `);

    res.json(words);
  } catch (error) {
    console.error("Error fetching restricted words:", error);
    res.status(500).json({ error: "Failed to fetch restricted words" });
  }
});

// Add restricted word
router.post("/restricted-words", async (req, res) => {
  try {
    const { word } = req.body;
    const adminId = req.session.userId;

    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    const [result] = await promisePool.query(
      "INSERT INTO RestrictedWord (word, added_by) VALUES (?, ?)",
      [word, adminId]
    );

    await logAdminAction(
      adminId,
      "INSERT",
      "RestrictedWord",
      result.insertId,
      `Added restricted word: ${word}`
    );

    res.status(201).json({
      message: "Restricted word added successfully",
      wordId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding restricted word:", error);
    res.status(500).json({ error: "Failed to add restricted word" });
  }
});

// Delete restricted word
router.delete("/restricted-words/:id", async (req, res) => {
  try {
    const wordId = req.params.id;
    const adminId = req.session.userId;

    await promisePool.query("DELETE FROM RestrictedWord WHERE word_id = ?", [
      wordId,
    ]);
    await logAdminAction(
      adminId,
      "DELETE",
      "RestrictedWord",
      wordId,
      "Deleted restricted word"
    );

    res.json({ message: "Restricted word deleted successfully" });
  } catch (error) {
    console.error("Error deleting restricted word:", error);
    res.status(500).json({ error: "Failed to delete restricted word" });
  }
});

// Get audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const [logs] = await promisePool.query(`
            SELECT al.*, u.name as admin_name
            FROM AuditLog al
            JOIN User u ON al.admin_id = u.user_id
            ORDER BY al.timestamp DESC
            LIMIT 100
        `);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});


// Get top movies report
router.get("/reports/top-movies", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const [movies] = await promisePool.query(
      "SELECT * FROM v_top_movies_by_rating LIMIT ?",
      [parseInt(limit)]
    );
    res.json(movies);
  } catch (error) {
    console.error("Error fetching top movies report:", error);
    res.status(500).json({ error: "Failed to fetch top movies report" });
  }
});

// Get top users report
router.get("/reports/top-users", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const [users] = await promisePool.query(
      "SELECT * FROM v_top_users_by_activity LIMIT ?",
      [parseInt(limit)]
    );
    res.json(users);
  } catch (error) {
    console.error("Error fetching top users report:", error);
    res.status(500).json({ error: "Failed to fetch top users report" });
  }
});

// Get top forums report
router.get("/reports/top-forums", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const [forums] = await promisePool.query(
      "SELECT * FROM v_top_forums LIMIT ?",
      [parseInt(limit)]
    );
    res.json(forums);
  } catch (error) {
    console.error("Error fetching top forums report:", error);
    res.status(500).json({ error: "Failed to fetch top forums report" });
  }
});

module.exports = router;
