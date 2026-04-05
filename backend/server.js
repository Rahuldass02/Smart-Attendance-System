const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json());

let attendance = [];
let currentSessionId = null;
let sessionStartTime = null;

const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

/* ===============================
   LOGIN ROUTE
=================================*/
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
=================================*/
app.post("/generate", async (req, res) => {

  currentSessionId = Date.now();
  sessionStartTime = Date.now();   // 🔥 Start timer
  attendance = [];

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
=================================*/
app.post("/scan", (req, res) => {

  const { sessionId, studentId } = req.body;

  if (!sessionId || !studentId) {
    return res.json({
      success: false,
      message: "Invalid scan data."
    });
  }

  // ❗ Check session validity
  if (parseInt(sessionId) !== currentSessionId) {
    return res.json({
      success: false,
      message: "Invalid session."
    });
  }

  // 🔥 Check expiration
  if (!sessionStartTime || (Date.now() - sessionStartTime > SESSION_DURATION)) {
    return res.json({
      success: false,
      message: "Session expired."
    });
  }

  // ❗ Prevent duplicates
  if (attendance.find(a => a.studentId === studentId)) {
    return res.json({
      success: false,
      message: "Already checked in."
    });
  }

  attendance.push({
    studentId: studentId,
    name: studentId,
    time: new Date().toLocaleTimeString()
  });

  res.json({
    success: true,
    message: "Attendance recorded!"
  });
});

/* ===============================
   GET ATTENDANCE LIST
=================================*/
app.get("/attendance/:id", (req, res) => {

  const sessionId = parseInt(req.params.id);

  if (sessionId !== currentSessionId) {
    return res.json([]);
  }

  res.json(attendance);
});

/* ===============================
   EXPORT CSV
=================================*/
app.get("/export/:id", (req, res) => {

  const sessionId = parseInt(req.params.id);

  if (sessionId !== currentSessionId || attendance.length === 0) {
    return res.send("No attendance records.");
  }

  let csv = "Student,Time\n";

  attendance.forEach(student => {
    csv += `${student.name},${student.time}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("attendance.csv");
  res.send(csv);
});

/* ===============================
   START SERVER
=================================*/
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});