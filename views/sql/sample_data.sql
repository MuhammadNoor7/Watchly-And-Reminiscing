
CREATE DATABASE IF NOT EXISTS MovieCommunityDB;
USE MovieCommunityDB;
-- drop database MovieCommunityDB;


-- 1. USER TABLE
CREATE TABLE User(
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,    
    password VARCHAR(255) NOT NULL,   
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_type ENUM('general','admin') DEFAULT 'general' NOT NULL
);
 
-- 2. MOVIE TABLE
CREATE TABLE Movie(
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    synopsis TEXT,
    release_year INT CHECK (release_year>=1800 AND release_year<=2100),
    poster_image VARCHAR(255)
);

-- 3. GENRE TABLE
CREATE TABLE Genre(
    genre_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 4. EVENT TABLE
CREATE TABLE Event(
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    host_id INT NOT NULL,
    movie_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    datetime DATETIME NOT NULL,
    capacity INT NOT NULL CHECK (capacity>0),
    FOREIGN KEY (host_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE
);

-- 5. RESTRICTED_WORD TABLE
CREATE TABLE RestrictedWord(
    word_id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(50) NOT NULL UNIQUE,
    added_by INT,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES User(user_id) ON DELETE SET NULL
);

-- 6. FRIENDSHIP TABLE
CREATE TABLE FriendRequest(
    request_id INT PRIMARY KEY  AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending','accepted','declined') DEFAULT 'pending' NOT NULL,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    response_date DATETIME,
    FOREIGN KEY (sender_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES User(user_id) ON DELETE CASCADE,
    UNIQUE KEY (sender_id,receiver_id),          
    CHECK (sender_id !=receiver_id)
);

-- 7. WATCHLIST TABLE
CREATE TABLE WatchlistEntry(
    entry_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    status ENUM('to-watch','watching','completed') DEFAULT 'to-watch' NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE,
    UNIQUE KEY  (user_id,movie_id)

);

-- 8. REVIEW TABLE
CREATE TABLE Review(
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating>=1 AND rating<=10),
    review_text TEXT,
    review_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, movie_id)          
);

-- 9. POST TABLE
CREATE TABLE Post(
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    content TEXT NOT NULL,
    post_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE
);

-- 10. COMMENT TABLE
CREATE TABLE Comment(
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    comment_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (post_id) REFERENCES Post(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 11. MESSAGE TABLE
CREATE TABLE Message(
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES User(user_id) ON DELETE CASCADE,
    CHECK (sender_id !=receiver_id)
);

-- 12. NOTIFICATION TABLE
CREATE TABLE Notification(
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    sender_id INT,
    trigger_event VARCHAR(50) NOT NULL,
    content VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_seen BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (recipient_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES User(user_id) ON DELETE SET NULL
);

-- 13. AUDIT_LOG TABLE
CREATE TABLE AuditLog(
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    operation VARCHAR(100) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details TEXT,
    FOREIGN KEY (admin_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 14. MOVIE_GENRE TABLE
CREATE TABLE MovieGenre(
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (movie_id,genre_id),
    FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genre(genre_id) ON DELETE CASCADE
);

-- 15. POST_LIKE TABLE
CREATE TABLE PostLike(
	post_id INT NOT NULL,
	user_id INT NOT NULL,
	liked_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (post_id,user_id),
	FOREIGN KEY (post_id) REFERENCES Post(post_id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 16. EVENT_PARTICIPATION TABLE
CREATE TABLE EventParticipation(
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (event_id,user_id),
    FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 17. FAVOURITE_GENRES TABLE ( MULTIVAL ) 
CREATE TABLE FavouriteGenre(
	favorite_genres VARCHAR(200) NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (user_id,favorite_genres),
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- INSERTIONS --

INSERT INTO User(name,email,password,user_type) VALUES
('Muaz Abdullah','muaz@gmail.com','muaz123','general'),
('Noor','noor@gmail.com','pass2','general'),
('Maimoona Hanan','maimoona@gmail.com','pass3','general'),
('Admin','admin@watchly.com','admin123','admin')
;

INSERT INTO Movie(title, synopsis, release_year, poster_image) VALUES
('Inception','Dream heist film',2010,'inception.jpg'),
('Interstellar','Space exploration',2014,'interstellar.jpg'),
('The Dark Knight','Batman vs Joker',2008,'tdk.jpg'),
('Hereditary','Horror story',2018,'hereditary.jpg'),
('Avatar','Pandora and Na’vi',2009,'avatar.jpg'),
('The Matrix','Simulation world',1999,'matrix.jpg'),
('The Godfather','Mafia crime drama',1972,'godfather.jpg'),
('Mad Max: Fury Road','Intense Race',2015,'madmax.jpg'),
('The Shawshank Redemption','Revenge Time',1994,'shank.jpg'),
('Avengers: Endgame','Superhero stuff',2019,'endgame.jpg'),
('Spider-Man: Into the Spider-verse','Verse Theme',2018,'spiderman.jpg'),
('Parasite','Revenge Uprising',2019,'parasite.jpg'),
('The Silence of the Lambs','Thriller Story',1991,'silence.jpg'),
('Whiplash','Motivation Booster',2014,'whiplash.jpg'),
('Se7en','Fight Club',1995,'seven.jpg'),
('Dune','Fate vs Free Will',2021,'dune.jpg'),
('Harry Potter and the Prisoner of Azkaban ','Fantasy Story',2004,'harry.jpg'),
('Spirited Away','Fantasy Girl',2001,'spirited.jpg'),
('Superbad','Trio Fun',2007,'superbad.jpg'),
('Joker','Joker Story',2019,'martian.jpg'),
('The Lion King','Lion Kingdom',1994,'lionking.jpg'),
('Blader Runner 2049','Future World',2017,'blade.jpg')
;


INSERT INTO Genre(name,description) VALUES
('Action','Action-packed movies'),
('Adventure','Adventure themed'),
('Sci-Fi','Science fiction films'),
('Drama','Dramatic stories'),
('Thriller','Suspense movies'),
('Fantasy','Fictional worlds'),
('Horror','Scary movies'),
('Comedy','Humorous content');


INSERT INTO Event(host_id,movie_id,title,description,datetime,capacity) VALUES
(1,1,'Inception Watch Party','Deep dive into dreams','2025-11-10 18:00',50),
(2,14,'Whiplash Watch Party ','Blurry lines between Inspiration And Abuse','2025-11-11 20:00',30),
(3,8,'Mad Max: Fury RoadWatch Party','Seeking Redemption And Controlling Logic.','2025-11-12 19:00',100)
;

INSERT INTO RestrictedWord(word,added_by) VALUES
('spam',4),
('abuse',4),
('hate',4),
('violence',4),
('scam',4),
('fraud',4),
('explicit',4),
('troll',4),
('fake',4),
('offensive',4);


INSERT INTO FriendRequest(sender_id,receiver_id,status,request_date,response_date) VALUES
(1,2,'accepted','2025-11-10 15:30:00', '2025-11-10 16:05:00'),
(2,3,'pending','2025-11-12 09:20:00',NULL),
(1,3,'declined','2025-11-08 13:15:00','2025-11-08 14:00:00')
;

INSERT INTO WatchlistEntry(user_id,movie_id,status,last_updated) VALUES
(1,1,'completed','2025-11-05 21:10:00'),
(2,2,'watching','2025-11-13 19:40:00'),
(3,3,'to-watch','2025-11-09 11:25:00')
;

INSERT INTO Review(user_id,movie_id,rating,review_text) VALUES
(1,1,9,'Amazing concept'),
(2,2,10,'Masterpiece'),
(3,3,9,'Best Batman film')
;


INSERT INTO Post(user_id,movie_id,content,post_date) VALUES
(1,1,'The ending explained - my theory','2025-11-06 21:30:00'),
(2,2,'Interstellar - Cooper Station','2025-11-13 20:45:00'),
(3,3,'Why Heath Ledger Joker is the greatest villain','2025-11-07 14:05:00')
;

INSERT INTO Comment(post_id,user_id,content,comment_date) VALUES
(1,2,'Totally agree!','2025-11-04 22:05:00'),
(2,1,'Absolutely!','2025-11-05 09:20:00'),
(3,2,'Iconic performance','2025-11-07 20:10:00'),
(1,3,'Best Movie!','2025-11-04 21:30:00'),
(2,3,'Gotham City!','2025-11-05 08:50:30')
;

INSERT INTO Message(sender_id,receiver_id,content) VALUES
(1,2,'Hi there'),
(2,3,'Hello!'),
(2,1,'How are you?'),
(1,3,'Good evening'),
(3,2,'Watch this movie'),
(3,1,'Let’s talk later')
;


INSERT INTO Notification(recipient_id,sender_id,trigger_event,content) VALUES
(1,2,'Liked','Noor liked your review of Inception'),
(3,2,'Commented','Noor commented on your post about The Dark Knight'),
(3,1,'Sent','Muaz sent you a friend request'),
(2,1,'Reminder','System Reminder: Inception Watch Party starts in 1 hour'),
(1,3,'Liked','Maimoona liked your review of Inception')
;

INSERT INTO AuditLog(admin_id,operation,target_table,target_id,details) VALUES
(4,'INSERT','Movie',1,'Added movie'),
(4,'INSERT','Movie',2,'Added movie'),
(4,'UPDATE','User',3,'Updated user email'),
(4,'DELETE','Post',4,'Removed post'),
(4,'INSERT','Genre',3,'Added genre'),
(4,'UPDATE','Review',5,'Edited review'),
(4,'INSERT','Event',1,'Created event'),
(4,'DELETE','Comment',2,'Comment removed'),
(4,'INSERT','RestrictedWord',3,'Added restricted word'),
(4,'UPDATE','Notification',4,'Notification updated');


INSERT INTO MovieGenre(movie_id,genre_id) VALUES
-- Inception: Sci-Fi, Action, Thriller
(1,3),(1,1),(1,5),
-- Interstellar: Sci-Fi, Drama, Adventure
(2,3),(2,4),(2,2),
-- The Dark Knight: Action, Drama, Thriller
(3,1),(3,4),(3,5),
-- Hereditary: Horror, Thriller
(4,7),(4,5),
-- Avatar: Sci-Fi, Adventure, Action
(5,3),(5,2),(5,1),
-- The Matrix: Sci-Fi, Action
(6,3),(6,1),
-- The Godfather: Drama
(7,4),
-- Mad Max Fury Road: Action, Adventure
(8,1),(8,2),
-- The Shawshank Redemption: Drama
(9,4),
-- Avengers Endgame: Action, Sci-Fi, Adventure
(10,1),(10,3),(10,2),
-- Spider-Man Into the Spider-verse: Action, Adventure, Sci-Fi
(11,1),(11,2),(11,3),
-- Parasite: Drama, Thriller
(12,4),(12,5),
-- The Silence of the Lambs: Thriller, Horror
(13,5),(13,7),
-- Whiplash: Drama
(14,4),
-- Se7en: Thriller, Drama
(15,5),(15,4),
-- Dune: Sci-Fi, Adventure, Drama
(16,3),(16,2),(16,4),
-- Harry Potter: Fantasy, Adventure
(17,6),(17,2),
-- Spirited Away: Fantasy, Adventure
(18,6),(18,2),
-- Superbad: Comedy
(19,8),
-- Joker: Drama, Thriller
(20,4),(20,5),
-- The Lion King: Adventure, Drama, Fantasy
(21,2),(21,4),(21,6),
-- Blade Runner 2049: Sci-Fi, Thriller
(22,3),(22,5);

INSERT INTO PostLike(post_id,user_id) VALUES
(1,2),
(1,3),
(3,1),
(3,2),
(2,1),
(2,3)
;

INSERT INTO EventParticipation(event_id,user_id) VALUES
(1,2),
(1,3),
(2,1),
(2,3),
(3,1),
(3,2)
;


INSERT INTO FavouriteGenre(user_id,favorite_genres) VALUES
(1,'Sci-Fi'),
(1,'Thriller'),
(2,'Fantasy'),
(2,'Drama'),
(3,'Action'),
(3,'Comedy');

ALTER TABLE Movie
ADD COLUMN poster_url VARCHAR(500) AFTER poster_image;

-- DATABASE VIEWS FOR REPORT GENERATION

-- View for Top Movies by Rating
CREATE OR REPLACE VIEW v_top_movies_by_rating AS
SELECT 
    m.movie_id,
    m.title,
    m.release_year,
    AVG(r.rating) AS average_rating,
    COUNT(DISTINCT r.review_id) AS review_count,
    COUNT(DISTINCT w.entry_id) AS watchlist_count
FROM Movie m
LEFT JOIN Review r ON m.movie_id = r.movie_id
LEFT JOIN WatchlistEntry w ON m.movie_id = w.movie_id
GROUP BY m.movie_id, m.title, m.release_year
HAVING COUNT(DISTINCT r.review_id) >= 1
ORDER BY average_rating DESC, review_count DESC
LIMIT 20;

-- View for Top Users by Activity
CREATE OR REPLACE VIEW v_top_users_by_activity AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.registration_date,
    (SELECT COUNT(*) FROM Review WHERE user_id = u.user_id) AS review_count,
    (SELECT COUNT(*) FROM Post WHERE user_id = u.user_id) AS post_count,
    (SELECT COUNT(*) FROM Comment WHERE user_id = u.user_id) AS comment_count,
    (SELECT COUNT(*) FROM WatchlistEntry WHERE user_id = u.user_id AND status = 'completed') AS movies_watched,
    (SELECT COUNT(*) FROM FriendRequest WHERE (sender_id = u.user_id OR receiver_id = u.user_id) AND status = 'accepted') AS friend_count
FROM User u
WHERE u.user_type = 'general'
GROUP BY u.user_id
ORDER BY (review_count + post_count + comment_count) DESC
LIMIT 20;

-- View for Top Forums (Posts with most engagement)
CREATE OR REPLACE VIEW v_top_forums AS
SELECT 
    p.post_id,
    p.content,
    p.post_date,
    u.name AS author_name,
    m.title AS movie_title,
    COUNT(DISTINCT pl.user_id) AS like_count,
    COUNT(DISTINCT c.comment_id) AS comment_count,
    (COUNT(DISTINCT pl.user_id) + COUNT(DISTINCT c.comment_id) * 2) AS engagement_score
FROM Post p
JOIN User u ON p.user_id = u.user_id
JOIN Movie m ON p.movie_id = m.movie_id
LEFT JOIN PostLike pl ON p.post_id = pl.post_id
LEFT JOIN Comment c ON p.post_id = c.post_id
GROUP BY p.post_id, p.content, p.post_date, u.name, m.title
ORDER BY engagement_score DESC, p.post_date DESC
LIMIT 20;

-- STORED PROCEDURES

DELIMITER //

-- Stored Procedure: Update Average Rating for a Movie
CREATE PROCEDURE sp_update_movie_rating(IN p_movie_id INT)
BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    
    SELECT AVG(rating) INTO avg_rating
    FROM Review
    WHERE movie_id = p_movie_id;
    
    SELECT avg_rating AS average_rating, COUNT(*) AS review_count
    FROM Review
    WHERE movie_id = p_movie_id;
END //

-- Stored Procedure: Get User Recommendations
CREATE PROCEDURE sp_get_user_recommendations(IN p_user_id INT, IN p_limit INT)
BEGIN
    
    SELECT DISTINCT
        m.movie_id,
        m.title,
        m.synopsis,
        m.release_year,
        m.poster_image,
        AVG(r.rating) AS average_rating,
        COUNT(DISTINCT r.review_id) AS review_count,
        GROUP_CONCAT(DISTINCT g.name SEPARATOR ', ') AS genres
    FROM Movie m
    LEFT JOIN MovieGenre mg ON m.movie_id = mg.movie_id
    LEFT JOIN Genre g ON mg.genre_id = g.genre_id
    LEFT JOIN Review r ON m.movie_id = r.movie_id
    WHERE m.movie_id NOT IN (
        SELECT movie_id FROM WatchlistEntry WHERE user_id = p_user_id
    )
    AND (
        -- Match user's favorite genres
        g.genre_id IN (
            SELECT genre_id FROM Genre WHERE name IN (
                SELECT favorite_genres FROM FavouriteGenre WHERE user_id = p_user_id
            )
        )
        OR
        -- High-rated movies
        (SELECT AVG(rating) FROM Review WHERE movie_id = m.movie_id) >= 7.0
    )
    GROUP BY m.movie_id, m.title, m.synopsis, m.release_year, m.poster_image
    ORDER BY average_rating DESC, review_count DESC
    LIMIT p_limit;
END //

DELIMITER ;

-- FUNCTIONS FOR RECOMMENDATIONS

DELIMITER //

-- Function: Calculate Movie Popularity Score
CREATE FUNCTION fn_calculate_movie_popularity(p_movie_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE popularity_score DECIMAL(10,2);
    
    SELECT 
        (COALESCE(AVG(r.rating), 0) * 2) +  
        (COUNT(DISTINCT r.review_id) * 0.5) +  
        (COUNT(DISTINCT w.entry_id) * 0.3) +  
        (COUNT(DISTINCT p.post_id) * 0.2)    
    INTO popularity_score
    FROM Movie m
    LEFT JOIN Review r ON m.movie_id = r.movie_id
    LEFT JOIN WatchlistEntry w ON m.movie_id = w.movie_id
    LEFT JOIN Post p ON m.movie_id = p.movie_id
    WHERE m.movie_id = p_movie_id
    GROUP BY m.movie_id;
    
    RETURN COALESCE(popularity_score, 0);
END //

-- Function: Get User Similarity Score (for recommendations)
CREATE FUNCTION fn_get_user_similarity(p_user1_id INT, p_user2_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE similarity_score DECIMAL(5,2);
    SELECT 
        (
            -- Common genres (weight: 30%)
            (SELECT COUNT(*) * 0.3 FROM FavouriteGenre f1
             JOIN FavouriteGenre f2 ON f1.favorite_genres = f2.favorite_genres
             WHERE f1.user_id = p_user1_id AND f2.user_id = p_user2_id) +
            -- Similar ratings (weight: 50%)
            (SELECT COUNT(*) * 0.5 FROM Review r1
             JOIN Review r2 ON r1.movie_id = r2.movie_id
             WHERE r1.user_id = p_user1_id AND r2.user_id = p_user2_id
             AND ABS(r1.rating - r2.rating) <= 2) +
            -- Common friends (weight: 20%)
            (SELECT COUNT(*) * 0.2 FROM FriendRequest fr1
             JOIN FriendRequest fr2 ON (
                 (fr1.sender_id = p_user1_id AND fr2.sender_id = p_user2_id) OR
                 (fr1.receiver_id = p_user1_id AND fr2.receiver_id = p_user2_id)
             )
             WHERE fr1.status = 'accepted' AND fr2.status = 'accepted')
        ) / 10.0  -- Normalize to 0-10 scale
    INTO similarity_score;
    RETURN COALESCE(similarity_score, 0);
END //

DELIMITER ;

-- TRIGGERS FOR AUDIT TRAIL

DELIMITER //

-- Trigger: Log admin actions on Movie table
CREATE TRIGGER trg_audit_movie_insert
AFTER INSERT ON Movie
FOR EACH ROW
BEGIN

END //

-- Trigger: Update last_updated when review is modified
CREATE TRIGGER trg_review_update_timestamp
BEFORE UPDATE ON Review
FOR EACH ROW
BEGIN
    SET NEW.last_updated = CURRENT_TIMESTAMP;
END //

DELIMITER ;
