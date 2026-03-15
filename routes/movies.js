const express = require("express");
const router = express.Router();
const { promisePool } = require("../config/database");


router.get("/", async (req, res) => {
  try {
    const { genre, search, limit = 50 } = req.query;

    let query = `
      SELECT 
          m.*,
          GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
          AVG(r.rating) AS average_rating,
          COUNT(DISTINCT r.review_id) AS review_count
      FROM Movie m
      LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genre g ON mg.genre_id = g.genre_id
      LEFT JOIN Review r ON m.movie_id = r.movie_id
    `;

    const conditions = [];
    const params = [];

    if (genre) {
      conditions.push("g.name = ?");
      params.push(genre);
    }

    if (search) {
      conditions.push("m.title LIKE ?");
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += `
      GROUP BY m.movie_id
      ORDER BY m.release_year DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [movies] = await promisePool.query(query, params);
    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});


router.get("/genres/all", async (req, res) => {
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


router.get("/recommendations", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit = 12 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Please login to get recommendations" });
    }

    // Use stored procedure for recommendations
    try {
      const [recommendations] = await promisePool.query(
        "CALL sp_get_user_recommendations(?, ?)",
        [userId, parseInt(limit)]
      );

      // Stored procedure returns result in first element of array
      const movies = recommendations[0] || [];
      return res.json(movies);
    } catch (spError) {
      // Fallback to popular movies if stored procedure fails
      console.log("Stored procedure not available, using fallback");
      const [movies] = await promisePool.query(
        `
        SELECT 
            m.*,
            GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
            AVG(r.rating) AS average_rating,
            COUNT(DISTINCT r.review_id) AS review_count
        FROM Movie m
        LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
        LEFT JOIN Genre g ON mg.genre_id = g.genre_id
        LEFT JOIN Review r ON m.movie_id = r.movie_id
        WHERE m.movie_id NOT IN (SELECT movie_id FROM WatchlistEntry WHERE user_id = ?)
        GROUP BY m.movie_id
        ORDER BY average_rating DESC, review_count DESC
        LIMIT ?
        `,
        [userId, parseInt(limit)]
      );
      return res.json(movies);
    }
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});


router.get("/trending", async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // Trending: Movies with most activity in the last 7 days
    const [movies] = await promisePool.query(
      `
      SELECT 
          m.*,
          GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
          AVG(r.rating) AS average_rating,
          COUNT(DISTINCT r.review_id) AS review_count,
          (COUNT(DISTINCT r.review_id) + 
           COUNT(DISTINCT w.entry_id) + 
           COUNT(DISTINCT p.post_id)) AS trending_score
      FROM Movie m
      LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genre g ON mg.genre_id = g.genre_id
      LEFT JOIN Review r ON m.movie_id = r.movie_id AND r.review_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      LEFT JOIN WatchlistEntry w ON m.movie_id = w.movie_id AND w.last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      LEFT JOIN Post p ON m.movie_id = p.movie_id AND p.post_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY m.movie_id
      HAVING trending_score > 0
      ORDER BY trending_score DESC, average_rating DESC
      LIMIT ?
      `,
      [parseInt(limit)]
    );

    res.json(movies);
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});


router.get("/popular", async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // Popular: Movies with highest ratings and most reviews
    const [movies] = await promisePool.query(
      `
      SELECT 
          m.*,
          GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
          AVG(r.rating) AS average_rating,
          COUNT(DISTINCT r.review_id) AS review_count
      FROM Movie m
      LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genre g ON mg.genre_id = g.genre_id
      LEFT JOIN Review r ON m.movie_id = r.movie_id
      GROUP BY m.movie_id
      HAVING COUNT(DISTINCT r.review_id) > 0
      ORDER BY average_rating DESC, review_count DESC
      LIMIT ?
      `,
      [parseInt(limit)]
    );

    res.json(movies);
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const movieId = req.params.id;

    const [movies] = await promisePool.query(
      `
      SELECT 
          m.*,
          GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') as genres,
          AVG(r.rating) as average_rating,
          COUNT(DISTINCT r.review_id) as review_count
      FROM Movie m
      LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
      LEFT JOIN Genre g ON mg.genre_id = g.genre_id
      LEFT JOIN Review r ON m.movie_id = r.movie_id
      WHERE m.movie_id = ?
      GROUP BY m.movie_id
      `,
      [movieId]
    );

    if (movies.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const movie = movies[0];

    // Fetch reviews
    const [reviews] = await promisePool.query(
      `
      SELECT r.*, u.name AS user_name
      FROM Review r
      JOIN User u ON r.user_id = u.user_id
      WHERE r.movie_id = ?
      ORDER BY r.review_date DESC
      `,
      [movieId]
    );

    movie.reviews = reviews;

    res.json(movie);
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});


router.get("/by-genre/:genreName", async (req, res) => {
  try {
    const genreName = req.params.genreName;

    const [movies] = await promisePool.query(
      `
      SELECT 
          m.*,
          GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
          AVG(r.rating) AS average_rating,
          COUNT(DISTINCT r.review_id) AS review_count
      FROM Movie m
      JOIN MovieGenre mg ON m.movie_id = mg.movie_id
      JOIN Genre g ON mg.genre_id = g.genre_id
      LEFT JOIN Review r ON m.movie_id = r.movie_id
      WHERE g.name = ?
      GROUP BY m.movie_id
      ORDER BY m.release_year DESC
      `,
      [genreName]
    );

    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies by genre:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});


router.post("/:id/reviews", async (req, res) => {
  try {
    const movieId = req.params.id;
    const { rating, review_text } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to add a review" });
    }

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ error: "Rating must be between 1 and 10" });
    }

    // Check existing review
    const [existing] = await promisePool.query(
      "SELECT * FROM Review WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );

    if (existing.length > 0) {
      // Update review
      await promisePool.query(
        "UPDATE Review SET rating = ?, review_text = ? WHERE user_id = ? AND movie_id = ?",
        [rating, review_text, userId, movieId]
      );

      return res.json({ message: "Review updated successfully" });
    }

    // Insert new review
    const [result] = await promisePool.query(
      "INSERT INTO Review (user_id, movie_id, rating, review_text) VALUES (?, ?, ?, ?)",
      [userId, movieId, rating, review_text]
    );

    res.status(201).json({
      message: "Review added successfully",
      reviewId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
});


router.delete("/:id/reviews", async (req, res) => {
  try {
    const movieId = req.params.id;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to delete a review" });
    }

    // Check if review exists and belongs to user
    const [reviews] = await promisePool.query(
      "SELECT * FROM Review WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    await promisePool.query(
      "DELETE FROM Review WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

module.exports = router;