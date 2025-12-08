CREATE TABLE all_movies (
    movie_id INTEGER PRIMARY KEY,
    movie_title TEXT NOT NULL,
    movie_genre TEXT NOT NULL,
    movie_runtime INTEGER NOT NULL,
    mpaa_rating TEXT,
    movie_language TEXT NOT NULL,
    movie_release_date TEXT NOT NULL,
    poster_path TEXT,
    poster_full_url TEXT,
    adult_01 INTEGER DEFAULT 0
);

-- Create users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    bio TEXT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create watched_list (depends on users + all_movies)
CREATE TABLE watched_list (
    watched_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    user_rating REAL,
    review TEXT,
    memory TEXT,
    watched_date TEXT,
    in_theater INTEGER,
    recommend INTEGER,
    rewatch_qty INTEGER,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (movie_id) REFERENCES all_movies(movie_id)
);


CREATE TABLE movie_language_lkp (
    movie_language_short TEXT PRIMARY KEY,
    movie_language TEXT
);