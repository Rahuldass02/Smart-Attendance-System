const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // change if your MySQL password is different
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

app.get("/", (req, res) => {
  res.send("Backend is working");
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { email, role, firstName, lastName } = req.body;

  if (!email || !role) {
    return res.json({
      success: false,
      message: "Missing login information."
    });
  }

  if (role === "student" && (!firstName || !lastName)) {
    return res.json({
      success: false,
      message: "Missing name information."
    });
  }

  const user = {
    id: email,
    email,
    role,
    firstName,
    lastName
  };

  res.json({
    success: true,
    userId: user.id,
    user
  });
});

/* GENERATE QR */
app.post("/generate", async (req, res) => {
  currentSessionId = Date.now();
  sessionStartTime = Date.now();

  try {
    const qrImage = await QRCode.toDataURL(currentSessionId.toString());

    res.json({
      success: true,
      sessionId: currentSessionId,
      qrImage,
      expiresIn: SESSION_DURATION
    });
  } catch (error) {
    res.json({
      success: false,
      message: "QR generation failed."
    });
  }
});

/* SCAN QR */
app.post("/scan", (req, res) => {
  console.log("SCAN ROUTE HIT");
  console.log("BODY:", req.body);

  const { sessionId, studentId, firstName, lastName } = req.body;
  
  console.log("Extracted values - sessionId:", sessionId, "studentId:", studentId, "firstName:", firstName, "lastName:", lastName);

  if (!sessionId || !studentId) {
    return res.json({
      success: false,
      message: "Invalid scan data."
    });
  }

  if (parseInt(sessionId) !== currentSessionId) {
    console.log("INVALID SESSION:", sessionId, currentSessionId);
    return res.json({
      success: false,
      message: "Invalid session."
    });
  }

  if (!sessionStartTime || Date.now() - sessionStartTime > SESSION_DURATION) {
    console.log("SESSION EXPIRED");
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
        console.error("Database error:", err);
        return res.json({
          success: false,
          message: "Database error."
        });
      }

      if (results.length > 0) {
        console.log("ALREADY CHECKED IN");
        return res.json({
          success: false,
          message: "Already checked in."
        });
      }

      const now = new Date();
      const time = now.toLocaleTimeString();
      const date = now.toISOString().split("T")[0];

      console.log("DATE SAVED:", date);
      console.log("About to insert with - firstName:", firstName, "lastName:", lastName);

      db.query(
        "INSERT INTO attendance (session_id, student_id, time, date, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
        [sessionId, studentId, time, date, firstName, lastName],
        (err2) => {
          if (err2) {
            console.error("Insert error:", err2);
            return res.json({
              success: false,
              message: "Could not save attendance."
            });
          }

          console.log("Successfully inserted attendance record");
          res.json({
            success: true,
            message: "Attendance recorded!"
          });
        }
      );
    }
  );
});

/* GET ATTENDANCE */
app.get("/attendance/:id", (req, res) => {
  const sessionId = req.params.id;

  db.query(
    "SELECT session_id, student_id, first_name, last_name, time, date FROM attendance WHERE session_id = ?",
    [sessionId],
    (err, results) => {
      if (err) {
        console.error("Attendance fetch error:", err);
        return res.json([]);
      }

      console.log("Attendance records:", results);
      res.json(results);
    }
  );
});

/* EXPORT CSV */
app.get("/export/:id", (req, res) => {
  const sessionId = req.params.id;

  db.query(
    "SELECT student_id, first_name, last_name, time, date FROM attendance WHERE session_id = ?",
    [sessionId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.send("No attendance records.");
      }

      let csv = "Student ID,First Name,Last Name,Time,Date\n";

      results.forEach((row) => {
        csv += `${row.student_id},${row.first_name},${row.last_name},${row.time},${row.date}\n`;
      });

      res.header("Content-Type", "text/csv");
      res.attachment("attendance.csv");
      res.send(csv);
    }
  );
});

/* START SERVER */
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});