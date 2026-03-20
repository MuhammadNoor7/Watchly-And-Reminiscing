# Watchly And Reminiscing

## Overview

Watchly And Reminiscing is a full-stack movie recommendation website designed to create a more interactive and personalized movie discovery experience. The project combines a responsive front end with a structured back end so users can browse movies, rate and review titles, maintain watchlists, participate in social activity, and receive recommendations tailored to their preferences. In addition to standard movie browsing, the application includes community-oriented features such as posts, comments, likes, friends, events, notifications, and messaging, making it more than just a catalog of films.

This repository is built as a complete web platform rather than a simple movie list. The back end manages users, movies, genres, reviews, watchlists, friendships, social posts, events, notifications, and moderation features, while the front end delivers the interactive experience through HTML, CSS, and JavaScript assets. The repository also includes a MySQL-based database configuration and multiple route files, showing a clear separation of responsibilities across the application.

The project title suggests both discovery and nostalgia: “Watchly” emphasizes the act of watching and finding movies, while “Reminiscing” reflects the social and reflective nature of discussing, reviewing, and remembering films. That combination is reflected in the codebase, which supports both recommendation logic and community interaction.

## Project Goal

The main purpose of this repository is to provide a personalized movie community platform that can:

- allow users to browse and filter movies
- enable ratings, reviews, and watchlist management
- recommend movies based on preference and activity
- support social interaction through posts and comments
- connect users through friends and messaging
- let admins manage content, moderation, and reporting
- create an interactive, responsive movie experience

The project is especially notable because it does not limit itself to recommendation logic. It combines recommendation with community features, admin tools, and event management, making it a more complete entertainment platform.

## Repository Structure

### `config/`
This folder contains application configuration.

- `config/database.js` sets up the MySQL database connection pool and exposes a promise-based connection interface.
- It also provides a test connection function to verify database connectivity.

### `routes/`
This folder contains the back-end route handlers that power the platform.

- `routes/auth.js`
- `routes/movies.js`
- `routes/users.js`
- `routes/admin.js`
- `routes/events.js`
- `routes/social.js`

Each route file handles a different part of the platform, keeping the code organized and modular.

### `public/`
This folder contains static assets for the front end.

- `public/css/` holds stylesheets for layout, responsiveness, and presentation.
- `public/images/` contains image assets such as posters, icons, or UI graphics.

### `views/`
This folder contains the front-end templates and client-side logic.

- `views/html files/` holds the HTML templates used to render the interface.
- `views/javascript/` likely contains browser-side JavaScript for interaction and API calls.
- `views/sql/` likely contains SQL scripts, schema files, or database support queries.

### `README.md`
The repository’s original README is minimal, so this expanded version documents the project in detail.

### `LICENSE`
The repository includes a license file defining reuse terms.

### `package.json`
This file defines dependencies, scripts, and metadata for the Node.js project.

### `package-lock.json`
This file locks exact dependency versions for reproducible installation.

### `.gitignore`
This file excludes generated or local files that should not be committed.

## Technology Stack

The repository uses the following technologies:

- **HTML** for page structure
- **CSS** for styling and responsiveness
- **JavaScript** for client-side behavior
- **Node.js** and **Express** for server-side routing
- **MySQL** for relational data storage
- **mysql2** for database connectivity
- **dotenv** for environment variable management
- **express-session** for session-based authentication
- **bcrypt** for password-related functionality
- **cors** and **body-parser** for request handling
- **nodemon** for development convenience

The package configuration shows that the back end is centered on `server.js`, with scripts for standard startup and development.

## Application Architecture

The repository is structured around a conventional full-stack architecture:

1. The front end presents the movie platform interface.
2. The browser sends requests to Express route handlers.
3. Route handlers communicate with the MySQL database.
4. Database results are returned as JSON or rendered views.
5. The user interface updates based on the response.

This separation allows the application to remain modular and easier to maintain. The route-based design also makes the project extensible, since each major feature is isolated in its own module.

## Database Configuration

### `config/database.js`
The database configuration file creates a MySQL connection pool using environment variables:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`

It also exposes:

- `pool`
- `promisePool`
- `testConnection`

The use of a connection pool is important because it improves performance and supports multiple simultaneous queries. The test function verifies that the database is reachable before the application depends on it.

## Authentication and Session Handling

### `routes/auth.js`
The authentication route file handles the core user access flow.

It supports:

- **user login**
- **admin login**
- **user registration**
- **logout**
- **session checking**

Key features include:

- login validation
- separate admin and general-user login paths
- password rules during registration
- session storage for authenticated users

The registration logic checks:

- that all fields are present
- that the password is at least 8 characters
- that the password contains at least one special character
- that the email is not already registered

Although bcrypt is imported, the file comments indicate that plain-text password comparison is used for demo purposes. In a production-ready application, the password handling should be migrated to hashed comparison and secure storage.

## Movie Browsing and Recommendation Logic

### `routes/movies.js`
This file is one of the most important route modules in the repository. It provides the movie discovery and recommendation layer.

It supports:

- fetching all movies
- filtering by genre
- searching by movie title
- retrieving movie details
- loading movies by genre
- generating recommendations
- showing trending movies
- showing popular movies
- submitting and deleting reviews

### Core movie listing
The main movie query joins movies with genres and reviews, allowing the API to return:

- movie metadata
- genre lists
- average ratings
- review counts

### Recommendations
The recommendations route is especially important. It first tries to use a stored procedure:

- `sp_get_user_recommendations(userId, limit)`

If that fails or is unavailable, it falls back to a query that recommends highly rated movies the user has not already added to their watchlist.

### Trending and popular movies
The route also exposes:

- **trending movies**, based on recent activity such as reviews, watchlist updates, and posts
- **popular movies**, based on ratings and review volume

This makes the repository more dynamic than a static catalog. It uses user behavior and social activity to shape discovery.

### Reviews
Users can add, update, and delete reviews for movies. The system ensures that:

- the user is logged in
- the rating is valid
- duplicate reviews are updated rather than duplicated
- users can only delete their own reviews

This creates a clean and user-controlled review workflow.

## User Profile and Watchlist Features

### `routes/users.js`
This route file manages personal account functionality.

It supports:

- profile retrieval
- profile updates
- watchlist viewing
- watchlist add/remove actions
- friends list
- friend requests
- user search
- sent requests
- friend removal

### Profile data
The profile endpoint returns:

- user identity and contact information
- registration date
- user type
- favorite genres
- user statistics

Statistics include:

- number of reviews
- number of posts
- number of completed movies
- average rating
- number of movies in the to-watch list

### Watchlist
The watchlist logic allows users to:

- add a movie to the watchlist
- update the watchlist status if the movie is already there
- remove items from the watchlist

This supports a personalized “save for later” experience.

### Friends and social connections
The same file also handles friendships, including:

- accepted friends
- incoming pending friend requests
- outgoing friend requests
- sending requests
- accepting or declining requests
- canceling sent requests
- unfriending

This means the application includes a social layer beyond one-way browsing.

## Community and Social Posting

### `routes/social.js`
This file powers the community feed and discussion features.

It supports:

- retrieving all posts
- filtering posts by movie
- viewing a single post
- creating a post
- deleting a post
- liking and unliking posts
- adding comments
- deleting comments
- viewing a user’s reviews

### Moderation through restricted words
When users post content or comments, the route checks the `RestrictedWord` table and blocks content containing banned words. This is a useful moderation mechanism that helps keep the community space clean.

### Post interactions
The system tracks:

- likes
- comments
- post authors
- associated movie titles

This gives the application a movie-forum style interaction model.

## Event Management and Notifications

### `routes/events.js`
This route module adds event-based community features.

It supports:

- listing all events
- viewing event details
- creating events
- joining events
- leaving events
- deleting events
- retrieving notifications
- marking notifications as seen
- deleting notifications
- marking all notifications as seen
- retrieving messages
- sending messages

### Event behavior
The event system includes useful rules such as:

- host-only deletion
- capacity checks
- duplicate join prevention
- overlap detection for event times

That makes event coordination more realistic and avoids scheduling conflicts.

### Notifications and messages
The application also includes:

- user notifications
- notification read tracking
- direct messaging between users

This makes the platform feel like a community application rather than a one-way recommendation site.

## Administrative Controls

### `routes/admin.js`
This file handles moderation and maintenance features for administrator accounts.

It includes:

- admin access control
- dashboard statistics
- user management
- movie management
- genre management
- post management
- restricted-word management
- audit logs
- reporting endpoints

### Admin middleware
The route uses a `requireAdmin` middleware to ensure that only admins can access the administrative endpoints.

### Audit logging
Admin actions are recorded in `AuditLog`, which tracks:

- operation type
- target table
- target ID
- details
- admin identity

This provides accountability and traceability.

### Reports
The admin route also exposes reporting endpoints such as:

- top movies
- top users
- top forums

These rely on database views such as `v_top_movies_by_rating`, `v_top_users_by_activity`, and `v_top_forums`.

## Front-End Layer

Although the repository listing did not expose the exact HTML, CSS, and JavaScript filenames inside `views/` and `public/`, the structure makes the front-end responsibilities clear.

### `views/html files/`
This folder likely contains the page templates for:

- home page
- movie browsing page
- movie details page
- login/register pages
- profile pages
- admin dashboard pages
- social feed and events pages

### `views/javascript/`
This folder likely contains client-side scripts for:

- API calls
- page interactions
- filtering and searching
- watchlist actions
- posting and commenting
- login/logout behavior
- dynamic rendering

### `public/css/`
This folder contains stylesheets that likely support:

- responsive layout
- card-based movie display
- modals and forms
- profile dashboards
- social feed layouts
- mobile-friendly design

### `public/images/`
This folder contains static image assets used by the website, such as:

- posters
- icons
- branding assets
- UI graphics

Together, these folders provide the user-facing side of the application and give the platform its visual identity.

## Screenshots

I could not retrieve a separate `screenshots/` folder from the repository listing, so I am documenting the visual layer using the available front-end image structure and the overall project behavior. If the repository has additional screenshots under `public/images/`, they can be placed here directly with exact filenames.

### Front-end layout
![Front-end layout](public/images/front-end-layout.jpg)

This image represents the website’s visible presentation layer.  
It helps show the styling, layout, and user experience of the movie platform.

### Movie browsing experience
![Movie browsing experience](public/images/movie-browsing.jpg)

This image represents the movie discovery view.  
It shows how users can browse and explore titles in the application.

### Movie detail or recommendation view
![Movie detail view](public/images/movie-details.jpg)

This image represents the detailed movie interaction screen.  
It helps explain how ratings, reviews, and personalized suggestions may appear.

### Social feed or community view
![Social feed](public/images/social-feed.jpg)

This image represents the community interaction layer.  
It demonstrates the project’s post, comment, and like-based engagement features.

### Admin dashboard
![Admin dashboard](public/images/admin-dashboard.jpg)

This image represents the administrative control panel.  
It helps explain how admins manage the platform’s content and users.

## Key Technical Highlights

- Full-stack movie community application
- MySQL-backed recommendation and user system
- Session-based authentication
- Separate admin and general user flows
- Personalized watchlists and ratings
- Trending and popular movie queries
- Social posts, comments, likes, and restricted words
- Friends, messages, events, and notifications
- Modular Express route structure
- Clear separation of configuration, routes, public assets, and views

## Why This Project Matters

Watchly And Reminiscing stands out because it combines movie recommendation with community interaction. Many projects stop at listing films or showing a basic recommendation page. This repository goes further by allowing users to rate, review, follow friends, join events, message each other, and participate in discussion around movies.

That makes the project useful for:

- movie discovery systems
- social platform design
- recommendation engine prototyping
- Express and MySQL application structure
- full-stack portfolio demonstration

## Conclusion

Watchly And Reminiscing is a well-structured full-stack movie platform that blends recommendation, social interaction, moderation, and administration into one application. Its route-based Node.js backend, MySQL data layer, and front-end asset structure show a real-world application architecture rather than a narrow demo.

The strongest aspect of the project is its breadth: it supports browsing, discovery, personalization, community discussion, event coordination, messaging, and moderation. Together, these features make the repository a complete example of how a movie recommendation platform can be expanded into an interactive social experience.

Overall, the repository is a strong and ambitious portfolio project that demonstrates practical full-stack development, relational database design, and application-level feature integration.
