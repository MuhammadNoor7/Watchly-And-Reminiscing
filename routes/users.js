const express = require("express");
const router = express.Router();
const { promisePool } = require("../config/database");

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to view profile" });
    }

    const [users] = await promisePool.query(
      `
            SELECT user_id, name, email, registration_date, user_type
            FROM User WHERE user_id = ?
        `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Get favorite genres
    const [genres] = await promisePool.query(
      "SELECT favorite_genres FROM FavouriteGenre WHERE user_id = ?",
      [userId]
    );
    user.favorite_genres = genres.map((g) => g.favorite_genres);

    // Get statistics
    const [stats] = await promisePool.query(
      `
            SELECT 
                (SELECT COUNT(*) FROM Review WHERE user_id = ?) as reviews_count,
                (SELECT COUNT(*) FROM Post WHERE user_id = ?) as posts_count,
                (SELECT COUNT(*) FROM WatchlistEntry WHERE user_id = ? AND status = 'completed') as movies_watched,
                (SELECT AVG(rating) FROM Review WHERE user_id = ?) as average_rating,
                (SELECT COUNT(*) FROM WatchlistEntry WHERE user_id = ? AND status = 'to-watch') as watchlist_count
        `,
      [userId, userId, userId, userId, userId]
    );

    user.statistics = stats[0];
    // Add average_rating directly to user object for easier access in frontend
    user.average_rating = stats[0].average_rating;

    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, email } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login to update profile" });
    }

    await promisePool.query(
      "UPDATE User SET name = ?, email = ? WHERE user_id = ?",
      [name, email, userId]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get user's watchlist
router.get("/watchlist", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to view watchlist" });
    }

    const [entries] = await promisePool.query(
      `
            SELECT 
                w.*, 
                m.title, 
                m.poster_image, 
                m.release_year, 
                m.synopsis,
                GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres,
                AVG(r.rating) AS average_rating
            FROM WatchlistEntry w
            JOIN Movie m ON w.movie_id = m.movie_id
            LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genre g ON mg.genre_id = g.genre_id
            LEFT JOIN Review r ON m.movie_id = r.movie_id
            WHERE w.user_id = ?
            GROUP BY w.entry_id, w.user_id, w.movie_id, w.status, w.last_updated, m.title, m.poster_image, m.release_year, m.synopsis
            ORDER BY w.last_updated DESC
        `,
      [userId]
    );

    res.json(entries);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// Add movie to watchlist
router.post("/watchlist", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { movie_id, status = "to-watch" } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Please login to add to watchlist" });
    }

    // Check if already in watchlist
    const [existing] = await promisePool.query(
      "SELECT * FROM WatchlistEntry WHERE user_id = ? AND movie_id = ?",
      [userId, movie_id]
    );

    if (existing.length > 0) {
      // Update status
      await promisePool.query(
        "UPDATE WatchlistEntry SET status = ? WHERE user_id = ? AND movie_id = ?",
        [status, userId, movie_id]
      );
      res.json({ message: "Watchlist updated" });
    } else {
      // Add new entry
      await promisePool.query(
        "INSERT INTO WatchlistEntry (user_id, movie_id, status) VALUES (?, ?, ?)",
        [userId, movie_id, status]
      );
      res.status(201).json({ message: "Added to watchlist" });
    }
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ error: "Failed to add to watchlist" });
  }
});

// Remove from watchlist
router.delete("/watchlist/:movieId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const movieId = req.params.movieId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "DELETE FROM WatchlistEntry WHERE user_id = ? AND movie_id = ?",
      [userId, movieId]
    );

    res.json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    res.status(500).json({ error: "Failed to remove from watchlist" });
  }
});

// Get friends
router.get("/friends", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to view friends" });
    }

    const [friends] = await promisePool.query(
      `
            SELECT u.user_id, u.name, u.email, fr.request_date, fr.response_date
            FROM FriendRequest fr
            JOIN User u ON (
                CASE 
                    WHEN fr.sender_id = ? THEN fr.receiver_id
                    ELSE fr.sender_id
                END = u.user_id
            )
            WHERE (fr.sender_id = ? OR fr.receiver_id = ?)
            AND fr.status = 'accepted'
            ORDER BY fr.response_date DESC
        `,
      [userId, userId, userId]
    );

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Get friend requests (pending)
router.get("/friend-requests", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    const [requests] = await promisePool.query(
      `
            SELECT fr.request_id, fr.sender_id, fr.request_date, u.name, u.email
            FROM FriendRequest fr
            JOIN User u ON fr.sender_id = u.user_id
            WHERE fr.receiver_id = ? AND fr.status = 'pending'
            ORDER BY fr.request_date DESC
        `,
      [userId]
    );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

// Send friend request
router.post("/friend-request", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { receiver_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    if (userId === receiver_id) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // Check if request already exists
    const [existing] = await promisePool.query(
      "SELECT * FROM FriendRequest WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
      [userId, receiver_id, receiver_id, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Friend request already exists" });
    }

    await promisePool.query(
      "INSERT INTO FriendRequest (sender_id, receiver_id) VALUES (?, ?)",
      [userId, receiver_id]
    );

    res.status(201).json({ message: "Friend request sent" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// Respond to friend request
router.put("/friend-request/:requestId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = req.params.requestId;
    const { status } = req.body; // 'accepted' or 'declined'

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await promisePool.query(
      "UPDATE FriendRequest SET status = ?, response_date = NOW() WHERE request_id = ? AND receiver_id = ?",
      [status, requestId, userId]
    );

    res.json({ message: `Friend request ${status}` });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    res.status(500).json({ error: "Failed to respond to friend request" });
  }
});

// Search users
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search query required" });
    }

    const [users] = await promisePool.query(
      `
            SELECT user_id, name, email
            FROM User
            WHERE (name LIKE ? OR email LIKE ?) AND user_type = 'general'
            LIMIT 20
        `,
      [`%${q}%`, `%${q}%`]
    );

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Get sent friend requests
router.get("/friend-requests/sent", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    const [requests] = await promisePool.query(
      `
            SELECT fr.request_id, fr.receiver_id, fr.request_date, u.name, u.email
            FROM FriendRequest fr
            JOIN User u ON fr.receiver_id = u.user_id
            WHERE fr.sender_id = ? AND fr.status = 'pending'
            ORDER BY fr.request_date DESC
        `,
      [userId]
    );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching sent friend requests:", error);
    res.status(500).json({ error: "Failed to fetch sent friend requests" });
  }
});

// Remove friend (unfriend)
router.delete("/friends/:friendId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const friendId = req.params.friendId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    // Delete the friend request (accepted status)
    await promisePool.query(
      "DELETE FROM FriendRequest WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'accepted'",
      [userId, friendId, friendId, userId]
    );

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

// Accept friend request
router.put("/friend-request/:requestId/accept", async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = req.params.requestId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "UPDATE FriendRequest SET status = 'accepted', response_date = NOW() WHERE request_id = ? AND receiver_id = ?",
      [requestId, userId]
    );

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// Decline friend request
router.put("/friend-request/:requestId/decline", async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = req.params.requestId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "UPDATE FriendRequest SET status = 'declined', response_date = NOW() WHERE request_id = ? AND receiver_id = ?",
      [requestId, userId]
    );

    res.json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Error declining friend request:", error);
    res.status(500).json({ error: "Failed to decline friend request" });
  }
});

// Cancel sent friend request
router.delete("/friend-request/:requestId", async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = req.params.requestId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "DELETE FROM FriendRequest WHERE request_id = ? AND sender_id = ? AND status = 'pending'",
      [requestId, userId]
    );

    res.json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    res.status(500).json({ error: "Failed to cancel friend request" });
  }
});

module.exports = router;
