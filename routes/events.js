const express = require("express");
const router = express.Router();
const { promisePool } = require("../config/database");

// Get all events
router.get("/", async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const [events] = await promisePool.query(`
            SELECT e.*, 
                   e.datetime as event_date,
                   e.capacity as max_capacity,
                   u.name as host_name,
                   m.title as movie_title,
                   m.poster_image,
                   COUNT(DISTINCT ep.user_id) as participant_count
            FROM Event e
            JOIN User u ON e.host_id = u.user_id
            JOIN Movie m ON e.movie_id = m.movie_id
            LEFT JOIN EventParticipation ep ON e.event_id = ep.event_id
            GROUP BY e.event_id
            ORDER BY e.datetime DESC
        `);

    // Add is_participant for each event separately to avoid SQL injection
    for (let event of events) {
      if (userId) {
        const [participations] = await promisePool.query(
          "SELECT 1 FROM EventParticipation WHERE event_id = ? AND user_id = ?",
          [event.event_id, userId]
        );
        event.is_participant = participations.length > 0;
      } else {
        event.is_participant = false;
      }
    }

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get single event with details
router.get("/:id", async (req, res) => {
  try {
    const eventId = req.params.id;

    const [events] = await promisePool.query(
      `
            SELECT e.*, 
                   u.name as host_name,
                   m.title as movie_title,
                   m.poster_image,
                   m.synopsis,
                   COUNT(DISTINCT ep.user_id) as participants_count
            FROM Event e
            JOIN User u ON e.host_id = u.user_id
            JOIN Movie m ON e.movie_id = m.movie_id
            LEFT JOIN EventParticipation ep ON e.event_id = ep.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `,
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = events[0];

    // Get participants
    const [participants] = await promisePool.query(
      `
            SELECT u.user_id, u.name, ep.joined_at
            FROM EventParticipation ep
            JOIN User u ON ep.user_id = u.user_id
            WHERE ep.event_id = ?
            ORDER BY ep.joined_at ASC
        `,
      [eventId]
    );

    event.participants = participants;

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Create event
router.post("/", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { movie_id, title, description, datetime, capacity } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login to create an event" });
    }

    if (!movie_id || !title || !datetime || !capacity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check for event overlaps (events within 3 hours of each other)
    const eventDatetime = new Date(datetime);
    const overlapStart = new Date(eventDatetime.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
    const overlapEnd = new Date(eventDatetime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after

    const [overlappingEvents] = await promisePool.query(
      `SELECT event_id, title, datetime 
       FROM Event 
       WHERE host_id = ? 
       AND datetime BETWEEN ? AND ?`,
      [userId, overlapStart, overlapEnd]
    );

    if (overlappingEvents.length > 0) {
      return res.status(409).json({
        error: "You have an overlapping event. Please choose a different time.",
        overlappingEvent: overlappingEvents[0],
      });
    }

    const [result] = await promisePool.query(
      "INSERT INTO Event (host_id, movie_id, title, description, datetime, capacity) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, movie_id, title, description, datetime, capacity]
    );

    res.status(201).json({
      message: "Event created successfully",
      eventId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Join event
router.post("/:id/join", async (req, res) => {
  try {
    const userId = req.session.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login to join event" });
    }

    // Check if event exists and has capacity
    const [events] = await promisePool.query(
      `
            SELECT e.*, COUNT(ep.user_id) as current_participants
            FROM Event e
            LEFT JOIN EventParticipation ep ON e.event_id = ep.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `,
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = events[0];

    if (event.current_participants >= event.capacity) {
      return res.status(400).json({ error: "Event is at full capacity" });
    }

    // Check if already joined
    const [existing] = await promisePool.query(
      "SELECT * FROM EventParticipation WHERE event_id = ? AND user_id = ?",
      [eventId, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Already joined this event" });
    }

    // Check for event overlaps (events within 3 hours of each other)
    const eventDatetime = new Date(event.datetime);
    const overlapStart = new Date(eventDatetime.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
    const overlapEnd = new Date(eventDatetime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after

    const [overlappingEvents] = await promisePool.query(
      `SELECT e.event_id, e.title, e.datetime 
       FROM Event e
       JOIN EventParticipation ep ON e.event_id = ep.event_id
       WHERE ep.user_id = ?
       AND e.datetime BETWEEN ? AND ?
       AND e.event_id != ?`,
      [userId, overlapStart, overlapEnd, eventId]
    );

    if (overlappingEvents.length > 0) {
      return res.status(409).json({
        error: "You have an overlapping event at this time. Please choose a different event.",
        overlappingEvent: overlappingEvents[0],
      });
    }

    await promisePool.query(
      "INSERT INTO EventParticipation (event_id, user_id) VALUES (?, ?)",
      [eventId, userId]
    );

    res.status(201).json({ message: "Successfully joined event" });
  } catch (error) {
    console.error("Error joining event:", error);
    res.status(500).json({ error: "Failed to join event" });
  }
});

// Leave event
router.delete("/:id/leave", async (req, res) => {
  try {
    const userId = req.session.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "DELETE FROM EventParticipation WHERE event_id = ? AND user_id = ?",
      [eventId, userId]
    );

    res.json({ message: "Left event successfully" });
  } catch (error) {
    console.error("Error leaving event:", error);
    res.status(500).json({ error: "Failed to leave event" });
  }
});

// Delete event (host only)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    // Check if user is the host
    const [events] = await promisePool.query(
      "SELECT host_id FROM Event WHERE event_id = ?",
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (events[0].host_id !== userId) {
      return res.status(403).json({ error: "Only the host can delete this event" });
    }

    // Delete event (cascade will handle EventParticipation)
    await promisePool.query("DELETE FROM Event WHERE event_id = ?", [eventId]);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Get notifications
router.get("/notifications/all", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Please login to view notifications" });
    }

    const [notifications] = await promisePool.query(
      `
            SELECT n.*, 
                   n.content as message,
                   n.trigger_event as type,
                   u.name as sender_name
            FROM Notification n
            LEFT JOIN User u ON n.sender_id = u.user_id
            WHERE n.recipient_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        `,
      [userId]
    );

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as seen
router.put("/notifications/:id/seen", async (req, res) => {
  try {
    const userId = req.session.userId;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "UPDATE Notification SET is_seen = TRUE WHERE notification_id = ? AND recipient_id = ?",
      [notificationId, userId]
    );

    res.json({ message: "Notification marked as seen" });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Delete notification
router.delete("/notifications/:id", async (req, res) => {
  try {
    const userId = req.session.userId;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "DELETE FROM Notification WHERE notification_id = ? AND recipient_id = ?",
      [notificationId, userId]
    );

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Mark all notifications as seen
router.put("/notifications/all/seen", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login" });
    }

    await promisePool.query(
      "UPDATE Notification SET is_seen = TRUE WHERE recipient_id = ?",
      [userId]
    );

    res.json({ message: "All notifications marked as seen" });
  } catch (error) {
    console.error("Error updating notifications:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Get messages
router.get("/messages/all", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Please login to view messages" });
    }

    const [messages] = await promisePool.query(
      `
            SELECT m.*,
                   u1.name as sender_name,
                   u2.name as receiver_name
            FROM Message m
            JOIN User u1 ON m.sender_id = u1.user_id
            JOIN User u2 ON m.receiver_id = u2.user_id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.timestamp DESC
        `,
      [userId, userId]
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message
router.post("/messages/send", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { receiver_id, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Please login to send messages" });
    }

    if (!receiver_id || !content) {
      return res
        .status(400)
        .json({ error: "Receiver and content are required" });
    }

    const [result] = await promisePool.query(
      "INSERT INTO Message (sender_id, receiver_id, content) VALUES (?, ?, ?)",
      [userId, receiver_id, content]
    );

    res.status(201).json({
      message: "Message sent successfully",
      messageId: result.insertId,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
