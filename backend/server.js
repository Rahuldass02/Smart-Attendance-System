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
  password: "",
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
let currentClassName = null;
let currentClassSection = null;
const SESSION_DURATION = 5 * 60 * 1000;

function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

app.get("/", (req, res) => {
  res.send("Backend is working");
});

/* SIGN UP */
app.post("/signup", (req, res) => {
  const { firstName, lastName, university, email, role, password } = req.body;

  if (!firstName || !lastName || !university || !email || !role || !password) {
    return res.json({
      success: false,
      message: "Please fill all sign up fields."
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!isStrongPassword(password)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol."
    });
  }

  db.query(
    "SELECT id FROM users WHERE email = ?",
    [cleanEmail],
    (err, results) => {
      if (err) {
        console.error("Signup check error:", err);
        return res.json({
          success: false,
          message: "Database error."
        });
      }

      if (results.length > 0) {
        return res.json({
          success: false,
          message: "This email is already registered."
        });
      }

      db.query(
        "INSERT INTO users (first_name, last_name, university, email, role, password) VALUES (?, ?, ?, ?, ?, ?)",
        [firstName, lastName, university, cleanEmail, role, password],
        (insertErr) => {
          if (insertErr) {
            console.error("Signup insert error:", insertErr);
            return res.json({
              success: false,
              message: "Could not create account."
            });
          }

          return res.json({
            success: true,
            message: "Signup complete."
          });
        }
      );
    }
  );
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { email, role, password } = req.body;

  if (!email || !role || !password) {
    return res.json({
      success: false,
      message: "Please enter email, role, and password."
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  db.query(
    "SELECT * FROM users WHERE email = ? AND role = ?",
    [cleanEmail, role],
    (err, results) => {
      if (err) {
        console.error("Login error:", err);
        return res.json({
          success: false,
          message: "Database error."
        });
      }

      if (results.length === 0) {
        return res.json({
          success: false,
          message: "Account not found."
        });
      }

      const user = results[0];

      if (user.password !== password) {
        return res.json({
          success: false,
          message: "Incorrect password."
        });
      }

      return res.json({
        success: true,
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          university: user.university
        }
      });
    }
  );
});

/* FORGOT PASSWORD */
app.post("/forgot-password", (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.json({
      success: false,
      message: "Please enter email and new password."
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!isStrongPassword(newPassword)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol."
    });
  }

  db.query(
    "SELECT id FROM users WHERE email = ?",
    [cleanEmail],
    (err, results) => {
      if (err) {
        console.error("Forgot password check error:", err);
        return res.json({
          success: false,
          message: "Database error."
        });
      }

      if (results.length === 0) {
        return res.json({
          success: false,
          message: "Email not found."
        });
      }

      db.query(
        "UPDATE users SET password = ? WHERE email = ?",
        [newPassword, cleanEmail],
        (updateErr) => {
          if (updateErr) {
            console.error("Forgot password update error:", updateErr);
            return res.json({
              success: false,
              message: "Could not update password."
            });
          }

          return res.json({
            success: true,
            message: "Password updated successfully."
          });
        }
      );
    }
  );
});

/* GENERATE QR */
app.post("/generate", async (req, res) => {
  const { className, classSection } = req.body;

  currentSessionId = Date.now();
  sessionStartTime = Date.now();
  currentClassName = className || "";
  currentClassSection = classSection || "";

  try {
    const qrImage = await QRCode.toDataURL(currentSessionId.toString());

    res.json({
      success: true,
      sessionId: currentSessionId,
      qrImage,
      expiresIn: SESSION_DURATION
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.json({
      success: false,
      message: "QR generation failed."
    });
  }
});

/* SCAN QR */
app.post("/scan", (req, res) => {
  const { sessionId, studentId, firstName, lastName } = req.body;

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
        console.error("Attendance duplicate check error:", err);
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

      const now = new Date();
      const time = now.toLocaleTimeString();
      const date = now.toISOString().split("T")[0];

      db.query(
        "INSERT INTO attendance (session_id, student_id, time, date, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
        [sessionId, studentId, time, date, firstName || "", lastName || ""],
        (insertErr) => {
          if (insertErr) {
            console.error("Attendance insert error:", insertErr);
            return res.json({
              success: false,
              message: "Could not save attendance."
            });
          }

          return res.json({
            success: true,
            message: "Attendance recorded!",
            className: currentClassName,
            classSection: currentClassSection
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

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});