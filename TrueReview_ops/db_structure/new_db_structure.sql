CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    bio TEXT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
) STRICT;

CREATE TABLE IF NOT EXISTS all_movies (
    movie_id INTEGER PRIMARY KEY,
    movie_title TEXT NOT NULL,
    movie_genre TEXT NOT NULL,
    movie_runtime INTEGER NOT NULL,
    mpaa_rating TEXT NOT NULL,
    movie_language TEXT NOT NULL,
    movie_release_date TEXT NOT NULL,
    poster_path TEXT NOT NULL, 
    poster_full_url TEXT NOT NULL,
    adult_01 INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS watched_list (
    watched_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
) STRICT;

CREATE TABLE movie_language_lkp (
    movie_language_short TEXT PRIMARY KEY,
    movie_language TEXT
);