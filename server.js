const express = require("express");
const pg = require("pg");
const session = require("express-session");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "Web_app")));

app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

const db = new pg.Client({
  connectionString:
    "postgresql://truereview_admin:TrNMyIlmWQqxTBtiownOkjAPiNGT6bK6@dpg-d4qhtuh5pdvs738o9d90-a.oregon-postgres.render.com/truereview",
  ssl: { rejectUnauthorized: false },
});

db.connect();

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      "SELECT user_id, username, email, password FROM users WHERE email = $1",
      [email]
    );

    if (!result.rowCount) return res.send("No user with that email.");

    const user = result.rows[0];

    if (user.password.trim() !== password.trim())
      return res.send("Invalid password.");

    req.session.user_id = user.user_id;
    req.session.username = user.username;

    res.redirect("/welcome.html");
  } catch (err) {
    console.error(err);
    res.send("Server error.");
  }
});

// USERNAME API
app.get("/api/username", (req, res) => {
  res.json({ username: req.session.username || null });
});

// DASHBOARD
app.get("/dashboard", async (req, res) => {
  if (!req.session.user_id) return res.redirect("/login.html");

  let recentMovie = null;
  let totalMovies = 0;
  let avgRating = null;
  let profile = null;

  try {
    profile = await db.query(
      `SELECT title, bio FROM users WHERE user_id=$1`,
      [req.session.user_id]
    );

    recentMovie = await db.query(
      `SELECT am.movie_title, am.poster_full_url, wl.user_rating
       FROM watched_list wl
       JOIN all_movies am ON wl.movie_id = am.movie_id
       WHERE wl.user_id=$1
       ORDER BY wl.watched_id DESC
       LIMIT 1`,
      [req.session.user_id]
    );

    const total = await db.query(
      `SELECT COUNT(*) AS total FROM watched_list WHERE user_id=$1`,
      [req.session.user_id]
    );
    totalMovies = total.rows[0].total;

    const avg = await db.query(
      `SELECT ROUND(AVG(user_rating)::numeric,2) AS avg_rating
       FROM watched_list WHERE user_id=$1`,
      [req.session.user_id]
    );
    avgRating = avg.rows[0].avg_rating || "N/A";
  } catch (err) {
    console.error(err);
  }

  const titleHTML =
    profile.rows[0].title
      ? `<div style="color:#ccc;font-size:18px;">"${profile.rows[0].title}"</div>`
      : "";

  const bioHTML =
    profile.rows[0].bio
      ? `<div style="color:white;font-size:24px;margin-top:8px;">${profile.rows[0].bio}</div>`
      : "";

  let recentHTML = `<div style="margin-top:20px;">No movies yet.</div>`;
  if (recentMovie.rowCount) {
    const m = recentMovie.rows[0];
    recentHTML = `
      <div style="margin-top:20px;">
        <img src="${m.poster_full_url}" style="width:150px;border-radius:16px;"><br><br>
        <span style="color:#FFF4B8;font-weight:bold;">${m.movie_title}</span>
        <span style="color:gray;">you rated it a</span>
        <span style="color:#FFF4B8;font-weight:bold;">${m.user_rating}/5</span>
      </div>
    `;
  }

  res.send(`
    <html>
    <head>
      <style>
        body { background:black;color:white;font-family:Times New Roman;text-align:center;padding-top:60px; }
        .btn {
          position:absolute;
          top:20px;
          background:#FFF4B8;
          padding:10px 20px;
          border-radius:8px;
          text-decoration:none;
          color:black;
          font-size:18px;
        }
        .addBtn { right:170px; }
        .watchedBtn { right:25px; }
        .btn:hover { background:#B8E8FF; }
      </style>
    </head>

    <body>
      <a class="btn addBtn" href="/add-movie">+ Add Movie</a>
      <a class="btn watchedBtn" href="/watched">Watched</a>

      <h1 style="font-size:48px;">${req.session.username}</h1>
      ${titleHTML}
      ${bioHTML}

      <div style="font-size:22px;color:#FFF4B8;margin-top:25px;">
        Total Movies: ${totalMovies} | Avg Rating: ${avgRating}
      </div>

      ${recentHTML}

      <a href="/logout"
        style="display:inline-block;margin-top:40px;
               padding:10px 20px;background:#FFF4B8;
               color:black;border-radius:8px;font-size:20px;">Logout</a>
    </body>
    </html>
  `);
});

// ADD MOVIE PAGE
app.get("/add-movie", (req, res) => {
  if (!req.session.user_id) return res.redirect("/login.html");

  res.send(`
    <html><body style="background:black;color:white;text-align:center;font-family:Times New Roman;padding-top:60px;">
      <h1>Add a Movie</h1>
      <form action="/search-movies" method="POST">
        <input type="text" name="title" placeholder="Search..."
               style="padding:10px;width:300px;border-radius:6px;">
        <button style="margin-top:10px;padding:10px 20px;border-radius:6px;background:#FFF4B8;">
          Search
        </button>
      </form>
      <a href="/dashboard" style="color:#B8E8FF;">Back</a>
    </body></html>
  `);
});

// SEARCH RESULTS
app.post("/search-movies", async (req, res) => {
  const title = req.body.title;

  try {
    const results = await db.query(
      `SELECT movie_id, movie_title, poster_full_url
       FROM all_movies
       WHERE movie_title ILIKE $1
       LIMIT 50`,
      [`%${title}%`]
    );

    let rows = results.rows
      .map(
        (m) => `
        <div style="
          display:flex;align-items:center;background:#1a1a1a;
          padding:10px;margin:12px auto;width:600px;border-radius:12px;">
          
          <img src="${m.poster_full_url}" 
               style="width:60px;height:90px;border-radius:8px;margin-right:15px;">

          <div style="flex-grow:1;">
            <div style="color:#FFF4B8;font-weight:bold;font-size:20px;">
              ${m.movie_title}
            </div>
          </div>

          <a href="/rate-movie?movie_id=${m.movie_id}
             &title=${encodeURIComponent(m.movie_title)}
             &poster=${encodeURIComponent(m.poster_full_url)}"
             style="background:#FFF4B8;padding:8px 16px;border-radius:8px;color:black;">
            Select
          </a>
        </div>
      `
      )
      .join("");

    res.send(`
      <html><body style="background:black;color:white;font-family:Times New Roman;padding:30px;">
        <h1 style="text-align:center;">Select a Movie</h1>
        ${rows}
        <a href="/add-movie" style="color:#B8E8FF;text-align:center;display:block;margin-top:20px;">Back</a>
      </body></html>
    `);
  } catch (err) {
    console.error(err);
    res.send("Error searching movies.");
  }
});

// RATE MOVIE PAGE
app.get("/rate-movie", (req, res) => {
  res.sendFile(path.join(__dirname, "Web_app/rate_movie.html"));
});

// INSERT MOVIE
app.post("/add-movie-final", async (req, res) => {
  const user_id = req.session.user_id;
  const movie_id = req.body.movie_id;
  const rating = req.body.rating;
  const review = req.body.review || null;

  try {
    await db.query(
      `INSERT INTO watched_list (user_id, movie_id, user_rating, review)
       VALUES ($1, $2, $3, $4)`,
      [user_id, movie_id, rating, review]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.send("Error adding movie.");
  }
});

// WATCHED PAGE
app.get("/watched", (req, res) => {
  res.sendFile(path.join(__dirname, "Web_app/watched.html"));
});

app.get("/api/watched", async (req, res) => {
  if (!req.session.user_id) return res.json([]);

  try {
    const results = await db.query(
      `SELECT wl.watched_id, am.movie_title, am.poster_full_url, wl.user_rating
       FROM watched_list wl
       JOIN all_movies am ON wl.movie_id = am.movie_id
       WHERE wl.user_id=$1
       ORDER BY wl.watched_id DESC`,
      [req.session.user_id]
    );

    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// MOVIE DETAIL PAGE
app.get("/movie/:watched_id", (req, res) => {
  res.sendFile(path.join(__dirname, "Web_app/movie_detail.html"));
});

// MOVIE DETAIL DATA API
app.get("/api/movie/:watched_id", async (req, res) => {
  const watched_id = req.params.watched_id;
  const user_id = req.session.user_id;

  try {
    const result = await db.query(
      `SELECT wl.watched_id, wl.user_rating, wl.review,
              am.movie_title, am.poster_full_url
       FROM watched_list wl
       JOIN all_movies am ON wl.movie_id = am.movie_id
       WHERE wl.watched_id = $1 AND wl.user_id = $2`,
      [watched_id, user_id]
    );

    if (!result.rowCount) return res.status(403).json({ error: "Unauthorized" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.json({ error: "Error fetching movie" });
  }
});

// SAVE MOVIE (EDIT)
app.post("/save-movie", async (req, res) => {
  const { watched_id, rating, review } = req.body;
  const user_id = req.session.user_id;

  try {
    await db.query(
      `UPDATE watched_list
       SET user_rating = $1, review = $2
       WHERE watched_id = $3 AND user_id = $4`,
      [rating, review || null, watched_id, user_id]
    );

    res.redirect("/movie/" + watched_id);
  } catch (err) {
    console.error(err);
    res.send("Error saving movie.");
  }
});

// NEW — DELETE MOVIE
app.post("/delete-movie", async (req, res) => {
  const { watched_id } = req.body;
  const user_id = req.session.user_id;

  try {
    await db.query(
      `DELETE FROM watched_list
       WHERE watched_id = $1 AND user_id = $2`,
      [watched_id, user_id]
    );

    return res.redirect("/watched");
  } catch (err) {
    console.error(err);
    res.send("Error deleting movie.");
  }
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.send(`
      <html><body style="background:black;color:white;text-align:center;">
      <h1>You are logged out</h1>
      <a href="/login.html" style="color:#B8E8FF;">Login Again</a>
      </body></html>
    `);
  });
});

app.listen(3000, () =>
  console.log("Server running on port 3000")
);
