const quizRoutes = require(`./routes/quiz`)
const express = require(`express`)
const cors = require (`cors`)
const session = require(`express-session`)
const jwt = require(`jsonwebtoken`)
const app = express()
const helmet = require(`helmet`)
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});
connection.connect(err => {
  if (err) {
      console.error('Error connecting to MySQL Database:', err);
      return;
  }
  console.log('Connected to MySQL Database!');
});
const userRoutes = require('./routes/users')(connection)

app.use(express.json());

app.use(helmet());

app.use(session({
  secret: process.env.SESSION_SECRET,
  proxy: true,
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure:true
  }
}));

app.use(cors({
  origin: "https://quiz.matt-hall.dev",
  credentials: true,
}));

app.use("/", function auth(req, res, next) {
  const origin = req.get('origin');
  if (origin !== "https://quiz.matt-hall.dev") {
    return res.status(403).json({ error: "Forbidden origin" });
  } else {
    next();
  }
});

app.use("/user", userRoutes);

app.use("/quiz", quizRoutes);

app.use("/", async function auth(req, res, next) {
  if (req.session.authorization) {
      const token = req.session.authorization.accessToken;
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) return res.status(403).json({ error: "Invalid token" });
          connection.query('SELECT username, total_score FROM users WHERE id = ?', [decoded.id], (dbErr, results) => {
              if (dbErr) return res.status(500).json({ error: "Database error" });
              if (results.length === 0) return res.status(404).json({ error: "User not found" });
              const userData = results[0];
              res.status(200).json({ userData });
          });
      });
  } else {
      res.status(403).json({ error: "No active session" });
  }
});


app.listen(process.env.PORT);