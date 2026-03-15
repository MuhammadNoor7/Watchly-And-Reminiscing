// API Configuration
const API_BASE_URL = "http://localhost:3000/api";

// Helper function for API calls
async function apiCall(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Important for session cookies
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "API request failed");
    }

    return result;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Authentication APIs
const Auth = {
  login: (email, password) =>
    apiCall("/auth/login", "POST", { email, password }),
  adminLogin: (email, password) =>
    apiCall("/auth/admin-login", "POST", { email, password }),
  register: (name, email, password) =>
    apiCall("/auth/register", "POST", { name, email, password }),
  logout: () => apiCall("/auth/logout", "POST"),
  checkSession: () => apiCall("/auth/check-session"),
};

// Movie APIs
const Movies = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/movies?${params}`);
  },
  getById: (id) => apiCall(`/movies/${id}`),
  getByGenre: (genreName) => apiCall(`/movies/by-genre/${genreName}`),
  getAllGenres: () => apiCall("/movies/genres/all"),
  addReview: (movieId, rating, review_text) =>
    apiCall(`/movies/${movieId}/reviews`, "POST", { rating, review_text }),
  deleteReview: (movieId) => apiCall(`/movies/${movieId}/reviews`, "DELETE"),
  getRecommendations: (limit = 12) => apiCall(`/movies/recommendations?limit=${limit}`),
  getTrending: (limit = 12) => apiCall(`/movies/trending?limit=${limit}`),
  getPopular: (limit = 12) => apiCall(`/movies/popular?limit=${limit}`),
};

// User APIs
const Users = {
  getProfile: () => apiCall("/users/profile"),
  updateProfile: (name, email) => {
    if (typeof name === 'object') {
      // Handle object parameter for backward compatibility
      return apiCall("/users/profile", "PUT", name);
    }
    return apiCall("/users/profile", "PUT", { name, email });
  },
  getWatchlist: () => apiCall("/users/watchlist"),
  addToWatchlist: (movie_id, status) =>
    apiCall("/users/watchlist", "POST", { movie_id, status }),
  removeFromWatchlist: (movieId) =>
    apiCall(`/users/watchlist/${movieId}`, "DELETE"),
  getFriends: () => apiCall("/users/friends"),
  getFriendRequests: () => apiCall("/users/friend-requests"),
  getSentFriendRequests: () => apiCall("/users/friend-requests/sent"),
  sendFriendRequest: (receiver_id) =>
    apiCall("/users/friend-request", "POST", { receiver_id }),
  acceptFriendRequest: (requestId) =>
    apiCall(`/users/friend-request/${requestId}/accept`, "PUT"),
  declineFriendRequest: (requestId) =>
    apiCall(`/users/friend-request/${requestId}/decline`, "PUT"),
  cancelFriendRequest: (requestId) =>
    apiCall(`/users/friend-request/${requestId}`, "DELETE"),
  removeFriend: (friendId) =>
    apiCall(`/users/friends/${friendId}`, "DELETE"),
  searchUsers: (query) =>
    apiCall(`/users/search?q=${encodeURIComponent(query)}`),
};

// Social APIs
const Social = {
  getPosts: (movieId = null) => {
    const params = movieId ? `?movie_id=${movieId}` : "";
    return apiCall(`/social/posts${params}`);
  },
  getPost: (id) => apiCall(`/social/posts/${id}`),
  createPost: (movie_id, content) =>
    apiCall("/social/posts", "POST", { movie_id: movie_id || null, content }),
  deletePost: (id) => apiCall(`/social/posts/${id}`, "DELETE"),
  likePost: (id) => apiCall(`/social/posts/${id}/like`, "POST"),
  addComment: (postId, content) =>
    apiCall(`/social/posts/${postId}/comments`, "POST", { content }),
  deleteComment: (id) => apiCall(`/social/comments/${id}`, "DELETE"),
  getReviews: () => apiCall("/social/reviews"),
};

// Event APIs
const Events = {
  getAll: () => apiCall("/events"),
  getById: (id) => apiCall(`/events/${id}`),
  create: (movie_id, title, description, datetime, capacity) =>
    apiCall("/events", "POST", {
      movie_id,
      title,
      description,
      datetime,
      capacity,
    }),
  join: (id) => apiCall(`/events/${id}/join`, "POST"),
  leave: (id) => apiCall(`/events/${id}/leave`, "DELETE"),
  delete: (id) => apiCall(`/events/${id}`, "DELETE"),
  getNotifications: () => apiCall("/events/notifications/all"),
  markNotificationSeen: (id) =>
    apiCall(`/events/notifications/${id}/seen`, "PUT"),
  markAllNotificationsAsSeen: () =>
    apiCall("/events/notifications/all/seen", "PUT"),
  getMessages: () => apiCall("/events/messages/all"),
  sendMessage: (receiver_id, content) =>
    apiCall("/events/messages/send", "POST", { receiver_id, content }),
};

// Admin APIs
const Admin = {
  getDashboard: () => apiCall("/admin/dashboard"),
  getUsers: () => apiCall("/admin/users"),
  deleteUser: (id) => apiCall(`/admin/users/${id}`, "DELETE"),
  getMovies: () => apiCall("/admin/movies"),
  addMovie: (title, synopsis, release_year, poster_image, genres) =>
    apiCall("/admin/movies", "POST", {
      title,
      synopsis,
      release_year,
      poster_image,
      genres,
    }),
  updateMovie: (id, title, synopsis, release_year, poster_image) =>
    apiCall(`/admin/movies/${id}`, "PUT", {
      title,
      synopsis,
      release_year,
      poster_image,
    }),
  deleteMovie: (id) => apiCall(`/admin/movies/${id}`, "DELETE"),
  getGenres: () => apiCall("/admin/genres"),
  addGenre: (name, description) =>
    apiCall("/admin/genres", "POST", { name, description }),
  updateGenre: (id, name, description) =>
    apiCall(`/admin/genres/${id}`, "PUT", { name, description }),
  deleteGenre: (id) => apiCall(`/admin/genres/${id}`, "DELETE"),
  getPosts: () => apiCall("/admin/posts"),
  deletePost: (id) => apiCall(`/admin/posts/${id}`, "DELETE"),
  getRestrictedWords: () => apiCall("/admin/restricted-words"),
  addRestrictedWord: (word) =>
    apiCall("/admin/restricted-words", "POST", { word }),
  deleteRestrictedWord: (id) =>
    apiCall(`/admin/restricted-words/${id}`, "DELETE"),
  getAuditLogs: () => apiCall("/admin/audit-logs"),
  getTopMovies: (limit = 20) => apiCall(`/admin/reports/top-movies?limit=${limit}`),
  getTopUsers: (limit = 20) => apiCall(`/admin/reports/top-users?limit=${limit}`),
  getTopForums: (limit = 20) => apiCall(`/admin/reports/top-forums?limit=${limit}`),
};

// Utility functions
function showMessage(message, type = "success") {
  alert(message); // You can replace this with a better notification system
}

function handleError(error) {
  console.error("Error:", error);
  showMessage(error.message || "An error occurred", "error");
}

// Check authentication on protected pages
async function checkAuth(requiredType = null) {
  try {
    const session = await Auth.checkSession();
    if (!session.authenticated) {
      window.location.href = "/login.html";
      return false;
    }
    if (requiredType && session.user.type !== requiredType) {
      window.location.href = "/login.html";
      return false;
    }
    return session.user;
  } catch (error) {
    window.location.href = "/login.html";
    return false;
  }
}
