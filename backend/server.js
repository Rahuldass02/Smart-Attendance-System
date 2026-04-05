const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234", // change this if your MySQL password is different
  database: "smart_attendance"
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
});

let currentSessionId = null;
let sessionStartTime = null;
const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

// Test route
app.get("/", (req, res) => {
  res.send("Backend is working");
});

/* ===============================
   LOGIN ROUTE
================================= */
app.post("/login", (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.json({
      success: false,
      message: "Missing login information."
    });
  }

  const user = {
    id: email,
    email: email,
    role: role
  };

  res.json({
    success: true,
    user: user
  });
});

/* ===============================
   GENERATE QR SESSION
================================= */
app.post("/generate", async (req, res) => {
  currentSessionId = Date.now();
  sessionStartTime = Date.now();

  try {
    const qrImage = await QRCode.toDataURL(currentSessionId.toString());

    res.json({
      success: true,
      sessionId: currentSessionId,
      qrImage: qrImage,
      expiresIn: SESSION_DURATION
    });
  } catch (error) {
    res.json({
      success: false,
      message: "QR generation failed."
    });
  }
});

/* ===============================
   STUDENT SCAN ROUTE
================================= */
app.post("/scan", (req, res) => {
  const { sessionId, studentId } = req.body;

  if (!sessionId || !studentId) {
    return res.json({
      success: false,
      message: "Invalid scan data."
    });
  }

  if (parseInt(sessionId) !== currentSessionId) {
    return res.json({
      success: false,
      message: "Invalid session."
    });
  }

  if (!sessionStartTime || Date.now() - sessionStartTime > SESSION_DURATION) {
    return res.json({
      success: false,
      message: "Session expired."
    });
  }

  db.query(
    "SELECT * FROM attendance WHERE session_id = ? AND student_id = ?",
    [sessionId, studentId],
    (err, results) => {
      if (err) {
        return res.json({
          success: false,
          message: "Database error."
        });
      }

      if (results.length > 0) {
        return res.json({
          success: false,
          message: "Already checked in."
        });
      }

      const time = new Date().toLocaleTimeString();

      db.query(
        "INSERT INTO attendance (session_id, student_id, time) VALUES (?, ?, ?)",
        [sessionId, studentId, time],
        (err2) => {
          if (err2) {
            return res.json({
              success: false,
              message: "Could not save attendance."
            });
          }

          res.json({
            success: true,
            message: "Attendance recorded!"
          });
        }
      );
    }
  );
});

/* ===============================
   GET ATTENDANCE LIST
================================= */
app.get("/attendance/:id", (req, res) => {
  const sessionId = req.params.id;

  db.query(
    "SELECT student_id AS name, time FROM attendance WHERE session_id = ?",
    [sessionId],
    (err, results) => {
      if (err) {
        return res.json([]);
      }

      res.json(results);
    }
  );
});

/* ===============================
   EXPORT CSV
================================= */
app.get("/export/:id", (req, res) => {
  const sessionId = req.params.id;

  db.query(
    "SELECT student_id, time FROM attendance WHERE session_id = ?",
    [sessionId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.send("No attendance records.");
      }

      let csv = "Student,Time\n";

      results.forEach((row) => {
        csv += `${row.student_id},${row.time}\n`;
      });

      res.header("Content-Type", "text/csv");
      res.attachment("attendance.csv");
      res.send(csv);
    }
  );
});

/* ===============================
   START SERVER
================================= */
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});