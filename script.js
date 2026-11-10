
// ==========================================
// STUDENT MANAGEMENT SYSTEM
// ==========================================

if (sessionStorage.getItem("loggedIn") !== "true") {
  location.href = "login.html";
}

// STORAGE
let students = JSON.parse(localStorage.getItem("students") || "[]");
let attendance = JSON.parse(localStorage.getItem("attendance") || "{}");
let timetable = JSON.parse(localStorage.getItem("timetable") || "[]");
let exams = JSON.parse(localStorage.getItem("exams") || "[]");
let marks = JSON.parse(localStorage.getItem("marks") || "[]");

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem("students", JSON.stringify(students));
  localStorage.setItem("attendance", JSON.stringify(attendance));
  localStorage.setItem("timetable", JSON.stringify(timetable));
  localStorage.setItem("exams", JSON.stringify(exams));
  localStorage.setItem("marks", JSON.stringify(marks));
}

function makeId() {
  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ==========================================
// NAVIGATION
// ==========================================

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    button.classList.add("active");
    $(button.dataset.page).classList.add("active");
    $("pageTitle").textContent = button.textContent;

    refreshAll();
  });
});

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("loggedIn");
  location.href = "login.html";
});

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark") ? "on" : "off"
  );
});

if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark");
}

$("todayDate").textContent = new Date().toLocaleDateString();
$("attendanceDate").value = today();
$("calendarMonth").value = today().slice(0, 7);

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {
  const date = $("attendanceDate").value || today();
  const records = attendance[date] || {};

  $("totalStudents").textContent = students.length;
  $("presentToday").textContent =
    Object.values(records).filter(v => v === "Present").length;
  $("absentToday").textContent =
    Object.values(records).filter(v => v === "Absent").length;
  $("totalExams").textContent = exams.length;
}

// ==========================================
// STUDENT MANAGEMENT
// ==========================================

function clearStudentForm() {
  $("studentForm").reset();
  $("studentId").value = "";
  $("studentFormTitle").textContent = "Add Student";
}

$("cancelStudentEdit").addEventListener("click", clearStudentForm);

$("studentForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = $("studentId").value;
  const roll = $("studentRoll").value.trim();

  const duplicate = students.some(s =>
    s.roll.toLowerCase() === roll.toLowerCase() && s.id !== id
  );

  if (duplicate) {
    alert("This roll number already exists.");
    return;
  }

  const student = {
    id: id || makeId(),
    name: $("studentName").value.trim(),
    roll,
    className: $("studentClass").value.trim(),
    email: $("studentEmail").value.trim(),
    phone: $("studentPhone").value.trim(),
    dob: $("studentDob").value,
    address: $("studentAddress").value.trim()
  };

  if (id) {
    students = students.map(s => s.id === id ? student : s);
  } else {
    students.push(student);
  }

  saveData();
  clearStudentForm();
  refreshAll();
  alert("Student saved successfully.");
});

function renderStudents() {
  const search = $("studentSearch").value.toLowerCase();

  const filtered = students.filter(s =>
    [s.name, s.roll, s.className, s.email]
      .some(v => String(v || "").toLowerCase().includes(search))
  );

  $("studentTable").innerHTML = filtered.map(s => `
    <tr>
      <td>${safe(s.roll)}</td>
      <td>${safe(s.name)}</td>
      <td>${safe(s.className)}</td>
      <td>${safe(s.email)}</td>
      <td>
        <button data-action="edit-student" data-id="${safe(s.id)}">Edit</button>
        <button class="danger" data-action="delete-student" data-id="${safe(s.id)}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">No students found.</td></tr>`;
}

$("studentSearch").addEventListener("input", renderStudents);

$("studentTable").addEventListener("click", e => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const student = students.find(s => s.id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "edit-student") {
    $("studentId").value = student.id;
    $("studentName").value = student.name;
    $("studentRoll").value = student.roll;
    $("studentClass").value = student.className;
    $("studentEmail").value = student.email || "";
    $("studentPhone").value = student.phone || "";
    $("studentDob").value = student.dob || "";
    $("studentAddress").value = student.address || "";
    $("studentFormTitle").textContent = "Edit Student";
    $("studentForm").scrollIntoView({behavior: "smooth"});
  }

  if (button.dataset.action === "delete-student") {
    if (!confirm("Delete this student and their associated records?")) return;

    students = students.filter(s => s.id !== student.id);

    Object.keys(attendance).forEach(date => {
      delete attendance[date][student.id];
    });

    marks = marks.filter(m => m.studentId !== student.id);

    saveData();
    refreshAll();
  }
});

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

function renderAttendance() {
  const date = $("attendanceDate").value || today();
  const records = attendance[date] || {};

  $("attendanceTable").innerHTML = students.map(s => `
    <tr>
      <td>${safe(s.roll)}</td>
      <td>${safe(s.name)}</td>
      <td>${safe(s.className)}</td>
      <td>
        <select class="attendance-status" data-id="${safe(s.id)}">
          <option value="Not Marked" ${!records[s.id] ? "selected" : ""}>Not Marked</option>
          <option value="Present" ${records[s.id] === "Present" ? "selected" : ""}>Present</option>
          <option value="Absent" ${records[s.id] === "Absent" ? "selected" : ""}>Absent</option>
        </select>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="4">Add students first.</td></tr>`;
}

$("attendanceDate").addEventListener("change", () => {
  renderAttendance();
  updateDashboard();
});

$("saveAttendance").addEventListener("click", () => {
  const date = $("attendanceDate").value;

  if (!date) {
    alert("Please select an attendance date.");
    return;
  }

  const records = {};

  document.querySelectorAll(".attendance-status").forEach(select => {
    if (select.value !== "Not Marked") {
      records[select.dataset.id] = select.value;
    }
  });

  attendance[date] = records;
  saveData();

  $("attendanceMessage").textContent =
    "Attendance saved. You can edit statuses and save again.";

  refreshAll();
});

// ==========================================
// MONTHLY ATTENDANCE CALENDAR
// ==========================================

function renderCalendar() {
  const monthValue = $("calendarMonth").value;
  if (!monthValue) return;

  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();

  let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map(day => `<div class="calendar-cell heading">${day}</div>`)
    .join("");

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-cell"></div>`;
  }

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const records = Object.values(attendance[date] || {});
    let status = "No record";
    let cls = "";

    if (records.length) {
      const present = records.filter(v => v === "Present").length;
      status = `${present} Present`;
      cls = present > 0 ? "present" : "absent";
    }

    html += `
      <div class="calendar-cell ${cls}" title="${safe(status)}">
        <strong>${day}</strong><br>${safe(status)}
      </div>`;
  }

  $("calendarGrid").innerHTML = html;
}

$("calendarMonth").addEventListener("change", renderCalendar);

// ==========================================
// CLASS TIMETABLE MANAGEMENT
// ==========================================

function clearTimetableForm() {
  $("timetableForm").reset();
  $("timetableId").value = "";
  $("timetableFormTitle").textContent = "Add Class Timetable";
}

$("cancelTimetableEdit").addEventListener("click", clearTimetableForm);

function timeOverlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

$("timetableForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = $("timetableId").value;
  const day = $("ttDay").value;
  const className = $("ttClass").value.trim();
  const start = $("ttStart").value;
  const end = $("ttEnd").value;

  if (end <= start) {
    alert("End time must be later than start time.");
    return;
  }

  const overlap = timetable.some(item =>
    item.id !== id &&
    item.day === day &&
    item.className.toLowerCase() === className.toLowerCase() &&
    timeOverlaps(start, end, item.start, item.end)
  );

  if (overlap) {
    alert("This class already has a timetable period at that time.");
    return;
  }

  const entry = {
    id: id || makeId(),
    day,
    className,
    subject: $("ttSubject").value.trim(),
    teacher: $("ttTeacher").value.trim(),
    start,
    end,
    room: $("ttRoom").value.trim()
  };

  if (id) {
    timetable = timetable.map(t => t.id === id ? entry : t);
  } else {
    timetable.push(entry);
  }

  saveData();
  clearTimetableForm();
  renderTimetable();
  alert("Timetable saved successfully.");
});

function renderTimetable() {
  const filter = $("timetableDayFilter").value;

  const dayOrder = {
    Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6
  };

  const list = timetable
    .filter(t => filter === "All" || t.day === filter)
    .sort((a, b) =>
      dayOrder[a.day] - dayOrder[b.day] ||
      a.start.localeCompare(b.start)
    );

  $("timetableTable").innerHTML = list.map(t => `
    <tr>
      <td>${safe(t.day)}</td>
      <td>${safe(t.start)} - ${safe(t.end)}</td>
      <td>${safe(t.className)}</td>
      <td>${safe(t.subject)}</td>
      <td>${safe(t.teacher)}</td>
      <td>${safe(t.room)}</td>
      <td>
        <button data-action="edit-timetable" data-id="${safe(t.id)}">Edit</button>
        <button class="danger" data-action="delete-timetable" data-id="${safe(t.id)}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="7">No timetable entries found.</td></tr>`;
}

$("timetableDayFilter").addEventListener("change", renderTimetable);

$("timetableTable").addEventListener("click", e => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const item = timetable.find(t => t.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit-timetable") {
    $("timetableId").value = item.id;
    $("ttDay").value = item.day;
    $("ttClass").value = item.className;
    $("ttSubject").value = item.subject;
    $("ttTeacher").value = item.teacher;
    $("ttStart").value = item.start;
    $("ttEnd").value = item.end;
    $("ttRoom").value = item.room;
    $("timetableFormTitle").textContent = "Edit Timetable";
    $("timetableForm").scrollIntoView({behavior: "smooth"});
  }

  if (button.dataset.action === "delete-timetable") {
    if (!confirm("Delete this timetable entry?")) return;
    timetable = timetable.filter(t => t.id !== item.id);
    saveData();
    renderTimetable();
  }
});

// ==========================================
// EXAMINATION MANAGEMENT
// ==========================================

function clearExamForm() {
  $("examForm").reset();
  $("examId").value = "";
  $("examFormTitle").textContent = "Create Examination";
}

$("cancelExamEdit").addEventListener("click", clearExamForm);

$("examForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = $("examId").value;
  const max = Number($("examMax").value);
  const pass = Number($("examPass").value);

  if (!Number.isFinite(max) || max <= 0) {
    alert("Maximum marks must be greater than zero.");
    return;
  }

  if (!Number.isFinite(pass) || pass < 0 || pass > max) {
    alert("Pass marks must be between zero and maximum marks.");
    return;
  }

  const exam = {
    id: id || makeId(),
    name: $("examName").value.trim(),
    subject: $("examSubject").value.trim(),
    date: $("examDate").value,
    maxMarks: max,
    passMarks: pass
  };

  if (id) {
    exams = exams.map(x => x.id === id ? exam : x);
  } else {
    exams.push(exam);
  }

  saveData();
  clearExamForm();
  renderExams();
  alert("Examination saved successfully.");
});

function renderExams() {
  $("examTable").innerHTML = exams.map(exam => `
    <tr>
      <td>${safe(exam.name)}</td>
      <td>${safe(exam.subject)}</td>
      <td>${safe(exam.date)}</td>
      <td>${safe(exam.maxMarks)}</td>
      <td>${safe(exam.passMarks)}</td>
      <td>
        <button data-action="edit-exam" data-id="${safe(exam.id)}">Edit</button>
        <button class="danger" data-action="delete-exam" data-id="${safe(exam.id)}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">No examinations created.</td></tr>`;

  const examOptions = exams.map(x =>
    `<option value="${safe(x.id)}">${safe(x.name)} - ${safe(x.subject)}</option>`
  ).join("");

  $("marksExam").innerHTML =
    `<option value="">Select exam</option>${examOptions}`;

  $("resultsExam").innerHTML =
    `<option value="">Select exam</option>${examOptions}`;

  renderStudentOptions();
  renderResults();
}

$("examTable").addEventListener("click", e => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const exam = exams.find(x => x.id === button.dataset.id);
  if (!exam) return;

  if (button.dataset.action === "edit-exam") {
    $("examId").value = exam.id;
    $("examName").value = exam.name;
    $("examSubject").value = exam.subject;
    $("examDate").value = exam.date;
    $("examMax").value = exam.maxMarks;
    $("examPass").value = exam.passMarks;
    $("examFormTitle").textContent = "Edit Examination";
    $("examForm").scrollIntoView({behavior: "smooth"});
  }

  if (button.dataset.action === "delete-exam") {
    if (!confirm("Delete this exam and all its marks?")) return;

    exams = exams.filter(x => x.id !== exam.id);
    marks = marks.filter(m => m.examId !== exam.id);

    saveData();
    renderExams();
  }
});

// ==========================================
// MARKS ENTRY
// ==========================================

function renderStudentOptions() {
  $("marksStudent").innerHTML =
    `<option value="">Select student</option>` +
    students.map(s =>
      `<option value="${safe(s.id)}">${safe(s.roll)} - ${safe(s.name)}</option>`
    ).join("");
}

function findMark(examId, studentId) {
  return marks.find(m =>
    m.examId === examId && m.studentId === studentId
  );
}

$("marksExam").addEventListener("change", loadExistingMark);
$("marksStudent").addEventListener("change", loadExistingMark);

function loadExistingMark() {
  const examId = $("marksExam").value;
  const studentId = $("marksStudent").value;
  const existing = findMark(examId, studentId);

  $("marksScore").value = existing ? existing.score : "";
}

$("saveMarks").addEventListener("click", () => {
  const examId = $("marksExam").value;
  const studentId = $("marksStudent").value;
  const scoreText = $("marksScore").value;

  if (!examId || !studentId || scoreText === "") {
    alert("Please select an exam, student and enter marks.");
    return;
  }

  const exam = exams.find(x => x.id === examId);
  if (!exam) return;

  const score = Number(scoreText);

  if (!Number.isFinite(score) || score < 0 || score > exam.maxMarks) {
    alert(`Marks must be between 0 and ${exam.maxMarks}.`);
    return;
  }

  const existing = findMark(examId, studentId);

  if (existing) {
    existing.score = score;
  } else {
    marks.push({
      id: makeId(),
      examId,
      studentId,
      score
    });
  }

  saveData();
  $("marksMessage").textContent = "Marks saved successfully.";
  renderResults();
});

// ==========================================
// RESULTS, PERCENTAGE AND GRADES
// ==========================================

function calculateGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 35) return "E";
  return "F";
}

function renderResults() {
  const examId = $("resultsExam").value;
  const exam = exams.find(x => x.id === examId);

  if (!exam) {
    $("resultsTable").innerHTML =
      `<tr><td colspan="6">Select an examination to view results.</td></tr>`;
    return;
  }

  $("resultsTable").innerHTML = students.map(student => {
    const record = findMark(examId, student.id);

    if (!record) {
      return `
        <tr>
          <td>${safe(student.roll)}</td>
          <td>${safe(student.name)}</td>
          <td>Not entered</td>
          <td>—</td>
          <td>—</td>
          <td>Pending</td>
        </tr>`;
    }

    const percentage = (record.score / exam.maxMarks) * 100;
    const grade = calculateGrade(percentage);
    const result = record.score >= exam.passMarks ? "Pass" : "Fail";

    return `
      <tr>
        <td>${safe(student.roll)}</td>
        <td>${safe(student.name)}</td>
        <td>${safe(record.score)} / ${safe(exam.maxMarks)}</td>
        <td>${percentage.toFixed(2)}%</td>
        <td>${grade}</td>
        <td>${result}</td>
      </tr>`;
  }).join("") || `<tr><td colspan="6">No students available.</td></tr>`;
}

$("resultsExam").addEventListener("change", renderResults);

// ==========================================
// ATTENDANCE REPORTS
// ==========================================

function renderReports() {
  $("reportsTable").innerHTML = students.map(student => {
    let present = 0;
    let absent = 0;

    Object.values(attendance).forEach(records => {
      if (records[student.id] === "Present") present++;
      if (records[student.id] === "Absent") absent++;
    });

    const total = present + absent;
    const percentage = total ? (present / total) * 100 : 0;
    const status = total === 0
      ? "No records"
      : percentage < 75 ? "Low Attendance" : "Good";

    return `
      <tr>
        <td>${safe(student.roll)}</td>
        <td>${safe(student.name)}</td>
        <td>${present}</td>
        <td>${absent}</td>
        <td>${total ? percentage.toFixed(1) + "%" : "—"}</td>
        <td>${status}</td>
      </tr>`;
  }).join("") || `<tr><td colspan="6">No students available.</td></tr>`;
}

// ==========================================
// REFRESH ALL SECTIONS
// ==========================================

function refreshAll() {
  renderStudents();
  renderAttendance();
  renderCalendar();
  renderTimetable();
  renderExams();
  renderReports();
  updateDashboard();
}

refreshAll();
