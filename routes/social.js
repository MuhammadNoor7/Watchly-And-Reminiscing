const express = require("express");
const router = express.Router();
const { promisePool } = require("../config/database");

// Get all posts with optional movie filter
router.get("/posts", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { movie_id } = req.query;

    let query = `
            SELECT p.*, 
                   u.name as user_name,
                   m.title as movie_title,
                   COUNT(DISTINCT pl.user_id) as like_count,
                   COUNT(DISTINCT c.comment_id) as comment_count
            FROM Post p
            JOIN User u ON p.user_id = u.user_id
            JOIN Movie m ON p.movie_id = m.movie_id
            LEFT JOIN PostLike pl ON p.post_id = pl.post_id
            LEFT JOIN Comment c ON p.post_id = c.post_id
        `;

    const params = [];
    if (movie_id) {
      query += " WHERE p.movie_id = ?";
      params.push(movie_id);
    }

    query += " GROUP BY p.post_id ORDER BY p.post_date DESC";

    const [posts] = await promisePool.query(query, params);
    
    // Add user_liked for each post separately to avoid SQL injection
    for (let post of posts) {
      if (userId) {
        const [likes] = await promisePool.query(
          "SELECT 1 FROM PostLike WHERE post_id = ? AND user_id = ?",
          [post.post_id, userId]
        );
        post.user_liked = likes.length > 0;
      } else {
        post.user_liked = false;
      }
    }
    
    // Get comments for each post
    for (let post of posts) {
      const [comments] = await promisePool.query(
        `SELECT c.*, u.name as user_name FROM Comment c JOIN User u ON c.user_id = u.user_id WHERE c.post_id = ? ORDER BY c.comment_date ASC`,
        [post.post_id]
      );
      post.comments = comments;
      post.created_at = post.post_date; // Add alias for consistency
    }
    
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get single post with details
router.get("/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // Get post
    const [posts] = await promisePool.query(
      `
            SELECT p.*, 
                   u.name as user_name,
                   m.title as movie_title,
                   COUNT(DISTINCT pl.user_id) as likes_count
            FROM Post p
            JOIN User u ON p.user_id = u.user_id
            JOIN Movie m ON p.movie_id = m.movie_id
            LEFT JOIN PostLike pl ON p.post_id = pl.post_id
            WHERE p.post_id = ?
            GROUP BY p.post_id
        `,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = posts[0];

    // Get comments
    const [comments] = await promisePool.query(
      `
            SELECT c.*, u.name as user_name
            FROM Comment c
            JOIN User u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.comment_date ASC
        `,
      [postId]
    );

    post.comments = comments;

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Create new post
router.post("/posts", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { movie_id, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login to create a post" });
    }

    if (!content) {
      return res
        .status(400)
        .json({ error: "Content is required" });
    }

    // Check for restricted words
    const [restrictedWords] = await promisePool.query(
      "SELECT word FROM RestrictedWord"
    );
    const contentLower = content.toLowerCase();

    for (const row of restrictedWords) {
      if (contentLower.includes(row.word.toLowerCase())) {
        return res.status(400).json({
          error: `Content contains restricted word: ${row.word}`,
        });
      }
    }

    // If no movie_id provided, get the first available movie
    let finalMovieId = movie_id;
    if (!finalMovieId || finalMovieId === 'null' || finalMovieId === '') {
      const [movies] = await promisePool.query("SELECT movie_id FROM Movie LIMIT 1");
      if (movies.length === 0) {
        return res.status(400).json({ error: "Cannot create post: No movies available. Please select a movie." });
      }
      finalMovieId = movies[0].movie_id;
    }

    const [result] = await promisePool.query(
      "INSERT INTO Post (user_id, movie_id, content) VALUES (?, ?, ?)",
      [userId, finalMovieId, content]
    );

    res.status(201).json({
      message: "Post created successfully",
      postId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Delete post
router.delete("/posts/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const postId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    // Check if user owns the post
    const [posts] = await promisePool.query(
      "SELECT * FROM Post WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (posts.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post" });
    }

    await promisePool.query("DELETE FROM Post WHERE post_id = ?", [postId]);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Like/Unlike post
router.post("/posts/:id/like", async (req, res) => {
  try {
    const userId = req.session.userId;
    const postId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login to like posts" });
    }

    // Check if already liked
    const [existing] = await promisePool.query(
      "SELECT * FROM PostLike WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existing.length > 0) {
      // Unlike
      await promisePool.query(
        "DELETE FROM PostLike WHERE post_id = ? AND user_id = ?",
        [postId, userId]
      );
      res.json({ message: "Post unliked", liked: false });
    } else {
      // Like
      await promisePool.query(
        "INSERT INTO PostLike (post_id, user_id) VALUES (?, ?)",
        [postId, userId]
      );
      res.json({ message: "Post liked", liked: true });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// Add comment to post
router.post("/posts/:id/comments", async (req, res) => {
  try {
    const userId = req.session.userId;
    const postId = req.params.id;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login to comment" });
    }

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Check for restricted words
    const [restrictedWords] = await promisePool.query(
      "SELECT word FROM RestrictedWord"
    );
    const contentLower = content.toLowerCase();

    for (const row of restrictedWords) {
      if (contentLower.includes(row.word.toLowerCase())) {
        return res.status(400).json({
          error: `Comment contains restricted word: ${row.word}`,
        });
      }
    }

    const [result] = await promisePool.query(
      "INSERT INTO Comment (post_id, user_id, content) VALUES (?, ?, ?)",
      [postId, userId, content]
    );

    res.status(201).json({
      message: "Comment added successfully",
      commentId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Delete comment
router.delete("/comments/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const commentId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    // Check if user owns the comment
    const [comments] = await promisePool.query(
      "SELECT * FROM Comment WHERE comment_id = ? AND user_id = ?",
      [commentId, userId]
    );

    if (comments.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    await promisePool.query("DELETE FROM Comment WHERE comment_id = ?", [
      commentId,
    ]);

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Get user's reviews
router.get("/reviews", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    const [reviews] = await promisePool.query(
      `
            SELECT r.*, m.title as movie_title, m.poster_image
            FROM Review r
            JOIN Movie m ON r.movie_id = m.movie_id
            WHERE r.user_id = ?
            ORDER BY r.review_date DESC
        `,
      [userId]
    );

    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

module.exports = router;
