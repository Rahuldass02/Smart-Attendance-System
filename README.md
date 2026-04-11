# 📌 Smart Attendance System

A full-stack web application designed to automate classroom attendance. This system replaces manual roll calls with dynamic QR code generation and real-time scanning validation.

## 🚀 Project Overview
This project was developed for the **ET 4999 Senior Design Capstone (Winter 2026)** at Wayne State University. It allows instructors to generate time-limited QR codes that students can scan via their mobile devices to mark themselves present.

### Key Features
* **Role-Based Login:** Separate dashboards for Instructors and Students.
* **Dynamic QR Generation:** 5-minute window for secure attendance.
* **Real-Time Database:** Instant updates using Node.js and MySQL.
* **Export Functionality:** Instructors can download attendance reports as CSV files.

---

## 🛠 Tech Stack
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Database:** MySQL
* **Libraries:** `qrcode` (Generation), `html5-qrcode` (Scanning), `cors`, `dotenv`

---

## 💻 Installation & Setup

### 1. Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.
* [MySQL Server](https://dev.mysql.com/downloads/mysql/) running locally (e.g., via XAMPP or native Mac MySQL).

### 2. Database Configuration
1. Open your MySQL terminal or phpMyAdmin.
2. Create the database:
   ```sql
   CREATE DATABASE smart_attendance;
Create the attendance table:

SQL
USE smart_attendance;
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255),
    student_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    time TIME,
    date DATE
);
3. Backend Setup
Navigate to the backend folder:

Bash
cd backend
Install dependencies:

Bash
npm install
Create a .env file in the backend folder and add your credentials:

Plaintext
DB_HOST=localhost
DB_USER=root
DB_PASS=YOUR_PASSWORD_HERE
DB_NAME=smart_attendance
PORT=3000
Start the server:

Bash
node server.js
👥 Team Responsibilities
Rahul Das: Frontend Development & UI/UX Design.

Farhan Kabiri: Backend Logic, QR Generation, and API functionality.

Tanim Ahmed: Database Design, Security Testing, and Documentation.

🧪 Testing Procedures
To ensure system integrity, we perform the following tests:

Connectivity Test: Verified backend link to MySQL database.

Scan Validation: Ensuring QR codes expire after 5 minutes.

Cross-Device Test: Scanning from mobile devices on external networks to verify server accessibility.


---

### How to use this:
1.  Open **VS Code**.
2.  In the explorer sidebar, right-click and select **New File**.
3.  Name it `README.md`.
4.  Paste the text above and save it (**Cmd + S**).
5.  **Push to GitHub:**
    ```bash
    git add README.md
    git commit -m "Added professional README for capstone submission"
    git push
    ```
