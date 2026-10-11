/* Learnix — student success workspace (local frontend prototype) */
(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const DAY_MS = 86400000;
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const PAGES = { overview: "Overview", students: "Student analytics", "early-warning": "Early warning", simulator: "Comeback simulator", planner: "AI study planner", quiz: "Quiz & exam prep", deadlines: "Assignment deadlines", assistant: "Study assistant", marks: "Marks tracker", gaps: "Smart gap planner", opportunities: "Opportunity matcher", consistency: "Consistency score", progress: "Progress tracker", reports: "Reports", settings: "Settings" };
  const KEYS = { students: "edurescue_students_v1", tasks: "edurescue_tasks_v1", snapshots: "edurescue_snapshots_v2", theme: "edurescue_theme_v1", banner: "edurescue_banner_hidden_v1", marks: "edurescue_marks_v1", deadlines: "edurescue_deadlines_v1", gaps: "edurescue_gap_slots_v1", activities: "edurescue_activity_v1", quizAttempts: "edurescue_quiz_attempts_v1", examPlans: "edurescue_exam_plans_v1", opportunityPrefs: "edurescue_opportunity_prefs_v1", assistantHistory: "edurescue_assistant_history_v1", reminderSeen: "edurescue_deadline_reminder_seen_v1", profile: "learnix_profile_v1" };

  const seedStudents = [
    { id: "STU-201", name: "Aanya Sharma", attendance: 94, marks: 88, assignments: 96, weakSubject: "Physics", assessments: [76, 82, 88] },
    { id: "STU-202", name: "Rahul Kumar", attendance: 58, marks: 42, assignments: 55, weakSubject: "Mathematics", assessments: [58, 49, 42] },
    { id: "STU-203", name: "Meera Singh", attendance: 86, marks: 78, assignments: 82, weakSubject: "Data Structures", assessments: [71, 75, 78] },
    { id: "STU-204", name: "Arjun Verma", attendance: 67, marks: 54, assignments: 61, weakSubject: "Programming", assessments: [65, 59, 54] },
    { id: "STU-205", name: "Ishita Patel", attendance: 91, marks: 91, assignments: 100, weakSubject: "Physics", assessments: [85, 88, 91] },
    { id: "STU-206", name: "Kabir Das", attendance: 73, marks: 68, assignments: 72, weakSubject: "Mathematics", assessments: [72, 70, 68] },
    { id: "STU-207", name: "Sara Ali", attendance: 79, marks: 74, assignments: 64, weakSubject: "Database Systems", assessments: [69, 71, 74] },
    { id: "STU-208", name: "Dev Malhotra", attendance: 49, marks: 38, assignments: 42, weakSubject: "Programming", assessments: [55, 44, 38] }
  ];
  const seedTasks = [
    { id: "task-1", day: "Monday", subject: "Mathematics", topic: "Revise one difficult topic", duration: 30, priority: "High", completed: false },
    { id: "task-2", day: "Tuesday", subject: "Programming", topic: "Practise 3 array problems", duration: 35, priority: "High", completed: false },
    { id: "task-3", day: "Wednesday", subject: "Mathematics", topic: "Solve 5 practice questions", duration: 30, priority: "Medium", completed: false },
    { id: "task-4", day: "Thursday", subject: "Programming", topic: "Review mistakes from practice", duration: 25, priority: "Medium", completed: false },
    { id: "task-5", day: "Friday", subject: "Mathematics", topic: "Complete pending assignment", duration: 40, priority: "High", completed: false },
    { id: "task-6", day: "Saturday", subject: "Mixed revision", topic: "Take a short practice quiz", duration: 30, priority: "Medium", completed: false },
    { id: "task-7", day: "Sunday", subject: "Weekly review", topic: "Reflect and plan next week", duration: 20, priority: "Low", completed: false }
  ];

  /* ---------- storage ---------- */
  let storageWarned = false;
  function readStore(key, fallback, validate) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return clone(fallback);
      const value = JSON.parse(raw);
      if (validate && !validate(value)) return clone(fallback);
      return value;
    } catch (error) {
      console.warn("Local data could not be read; using defaults.", error);
      return clone(fallback);
    }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) {
      if (!storageWarned) { storageWarned = true; toast("Could not save data", "Browser storage may be full or unavailable. Changes will last until you close this tab."); }
      return false;
    }
  }
  const isStudentList = v => Array.isArray(v) && v.every(s => s && typeof s.id === "string" && typeof s.name === "string");
  const isTaskList = v => Array.isArray(v) && v.every(t => t && typeof t.id === "string");

  function buildSeedSnapshots(list) {
    const now = Date.now(), out = [];
    list.forEach(s => {
      const a = (s.assessments || []).slice(-3);
      if (a.length < 3) return;
      a.forEach((score, i) => {
        const diff = s.marks - score;
        out.push({ id: `seed-${s.id}-${i}`, studentId: s.id, date: new Date(now - (2 - i) * 14 * DAY_MS).toISOString(), attendance: clamp(Math.round(s.attendance - diff * 0.5)), marks: score, assignments: clamp(Math.round(s.assignments - diff * 0.6)) });
      });
    });
    return out;
  }

  let students = readStore(KEYS.students, seedStudents, isStudentList);
  students.forEach(s => { if (!Array.isArray(s.assessments) || !s.assessments.length) s.assessments = [Number(s.marks) || 0]; });
  let tasks = readStore(KEYS.tasks, seedTasks, isTaskList);
  let snapshots = readStore(KEYS.snapshots, null, Array.isArray);
  if (snapshots === null) { snapshots = buildSeedSnapshots(students); writeStore(KEYS.snapshots, snapshots); }

  let performanceChart = null, attendanceChart = null, progressChart = null;
  let marksEntries = readStore(KEYS.marks, [], Array.isArray);
  let deadlines = readStore(KEYS.deadlines, [], Array.isArray);
  let gapSlots = readStore(KEYS.gaps, [], Array.isArray);
  let activities = readStore(KEYS.activities, [], Array.isArray);
  let quizAttempts = readStore(KEYS.quizAttempts, [], Array.isArray);
  let examPlans = readStore(KEYS.examPlans, [], Array.isArray);
  let opportunityPrefs = readStore(KEYS.opportunityPrefs, { interests: ["hackathons"], skills: "", level: "beginner", hours: 5 }, v => v && typeof v === "object");
  let assistantHistory = readStore(KEYS.assistantHistory, [], Array.isArray);
  let profile = readStore(KEYS.profile, { name: "Prince Sharma", role: "B.Tech CSE · Student" }, v => v && typeof v.name === "string" && typeof v.role === "string");
  if (!profile.name.trim()) profile.name = "Prince Sharma";
  if (!profile.role.trim()) profile.role = "Student";
  let activeQuiz = null;
  let activePage = "overview";

  /* ---------- utilities ---------- */
  function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase(); }
  function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function average(key, list = students) { return list.length ? list.reduce((sum, s) => sum + Number(s[key] || 0), 0) / list.length : 0; }
  function isDark() { return document.body.classList.contains("dark-mode"); }
  function palette() {
    const dark = isDark();
    return { primary: dark ? "#9aa6ff" : "#4b4cf0", light: dark ? "#4a4f93" : "#c4c9fb", green: "#55bd91", amber: "#e3a44c", grid: dark ? "#33364c" : "#eef0f6", muted: dark ? "#a3a8bf" : "#9297aa", surface: dark ? "#202335" : "#ffffff" };
  }

  function getSignals(student) {
    const reasons = [];
    if (Number(student.attendance) < 75) reasons.push("Attendance below 75%");
    if (Number(student.marks) < 50) reasons.push("Score below 50%");
    const a = Array.isArray(student.assessments) ? student.assessments : [];
    if (a.length >= 2 && a[a.length - 1] < a[a.length - 2] - 7) reasons.push("Recent score has declined");
    if (Number(student.assignments) < 65) reasons.push("Assignment completion below 65%");
    return reasons;
  }
  function studentStatus(s) {
    if (getSignals(s).length) return "support";
    return Number(s.attendance) < 82 || Number(s.marks) < 65 || Number(s.assignments) < 75 ? "watch" : "ontrack";
  }
  const statusLabel = st => st === "support" ? "Review support" : st === "watch" ? "Keep an eye" : "On track";
  const statusClass = st => st === "support" ? "status-support" : st === "watch" ? "status-watch" : "status-ontrack";

  function toast(title, message = "") {
    const region = $("#toastRegion"); if (!region) return;
    const node = document.createElement("div"); node.className = "toast";
    const icon = document.createElement("i"); icon.className = "fa-solid fa-circle-check";
    const copy = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = title; copy.append(strong);
    if (message) { const p = document.createElement("p"); p.textContent = message; copy.append(p); }
    node.append(icon, copy); region.append(node);
    window.setTimeout(() => node.remove(), 3600);
  }

  /* ---------- navigation ---------- */
  function renderCurrentPage() {
    switch (activePage) {
      case "overview": renderGreeting(); renderOverview(); break;
      case "students": renderStudents(); break;
      case "early-warning": renderWarnings(); break;
      case "simulator": populateStudentSelects(); updateSimulator(); break;
      case "planner": renderTasks(); break;
      case "quiz": renderQuizPage(); break;
      case "deadlines": renderDeadlines(); break;
      case "assistant": renderAssistant(); break;
      case "marks": renderMarks(); break;
      case "gaps": renderGapSlots(); break;
      case "opportunities": renderOpportunityPrefs(); break;
      case "consistency": renderConsistency(); break;
      case "progress": populateStudentSelects(); renderProgress(); break;
      case "reports": renderReport(); break;
      case "settings": $("#settingsThemeToggle").checked = isDark(); break;
    }
  }
  function goTo(page, opts = {}) {
    const target = $(`#page-${page}`);
    if (!target) return;
    activePage = page;
    $$(".page-section").forEach(sec => sec.classList.toggle("active", sec === target));
    $$(".nav-item[data-nav]").forEach(btn => btn.classList.toggle("active", btn.dataset.nav === page));
    $$(".nav-item[data-nav]").forEach(btn => { if (btn.dataset.nav === page) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current"); });
    $("#breadcrumbTitle").textContent = PAGES[page] || "Overview";
    document.title = `${PAGES[page] || "Overview"} · Learnix`;
    closeSidebar();
    try { history.replaceState(null, "", `#${page}`); } catch (e) { /* file:// or sandbox */ }
    renderCurrentPage();
    if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeSidebar() { $("#sidebar").classList.remove("open"); $("#mobileScrim").classList.add("hidden"); }

  function renderGreeting() {
    const now = new Date(), h = now.getHours();
    const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    const firstName = (profile.name.trim().split(/\s+/)[0] || "there");
    $("#greeting").innerHTML = `Good ${part}, ${escapeHTML(firstName)} <span class="wave">✦</span>`;
    $("#todayEyebrow").textContent = `${now.toLocaleDateString(undefined, { weekday: "long" })}, your next step starts here`;
  }

  /* ---------- tables ---------- */
  const studentAvatar = s => `<span class="student-avatar">${escapeHTML(initials(s.name))}</span>`;
  const progressBar = (value, color = "") => `<div class="progress-track"><span style="width:${clamp(Number(value) || 0)}%;${color ? `background:${color};` : ""}"></span></div>`;
  function studentRow(student, compact = false) {
    const status = studentStatus(student), signals = getSignals(student), id = escapeHTML(student.id);
    const head = `<td><div class="student-cell">${studentAvatar(student)}<div><strong>${escapeHTML(student.name)}</strong><small>${id}</small></div></div></td><td><div class="mini-progress">${progressBar(student.attendance)}<em>${Number(student.attendance)}%</em></div></td><td><div class="mini-progress">${progressBar(student.marks, "#8d7de9")}<em>${Number(student.marks)}%</em></div></td>`;
    if (compact) return `<tr>${head}<td><span class="status-pill ${statusClass(status)}">${escapeHTML(signals[0] || "No current flag")}</span></td><td><button class="icon-button tiny" data-action="details" data-id="${id}" aria-label="View ${escapeHTML(student.name)}"><i class="fa-solid fa-arrow-up-right-from-square"></i></button></td></tr>`;
    return `<tr>${head}<td>${Number(student.assignments)}%</td><td><span class="status-pill ${statusClass(status)}">${statusLabel(status)}</span></td><td><button class="icon-button tiny" data-action="details" data-id="${id}" aria-label="View details"><i class="fa-regular fa-eye"></i></button> <button class="icon-button tiny" data-action="edit" data-id="${id}" aria-label="Edit student"><i class="fa-solid fa-pen"></i></button> <button class="icon-button tiny" data-action="delete" data-id="${id}" aria-label="Delete student"><i class="fa-regular fa-trash-can"></i></button></td></tr>`;
  }

  /* ---------- overview + charts ---------- */
  function renderOverview() {
    const support = students.filter(s => studentStatus(s) === "support");
    $("#metricStudents").textContent = students.length;
    $("#metricAttendance").innerHTML = `${average("attendance").toFixed(1)}<span class="metric-unit">%</span>`;
    $("#metricMarks").innerHTML = `${average("marks").toFixed(1)}<span class="metric-unit">%</span>`;
    $("#metricSupport").textContent = support.length;
    $("#attendanceBig").textContent = `${average("attendance").toFixed(1)}%`;
    $("#overviewSupportRows").innerHTML = support.slice(0, 4).map(s => studentRow(s, true)).join("") || `<tr><td colspan="5">No current support signals in the available records.</td></tr>`;
    $("#supportTableCount").textContent = `Showing ${Math.min(support.length, 4)} of ${support.length} records flagged for review`;
    renderCharts();
  }
  function baseChartOptions({ min = 0, max = 100, step = 25, legend = false } = {}) {
    const p = palette();
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legend ? { display: true, position: "bottom", labels: { usePointStyle: true, boxWidth: 6, padding: 18, color: p.muted, font: { family: "Instrument Sans", size: 12 } } } : { display: false }, tooltip: { backgroundColor: "#0f1535", padding: 10, titleFont: { family: "Instrument Sans", size: 13 }, bodyFont: { family: "Instrument Sans", size: 12 }, displayColors: false } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: p.muted, font: { family: "Instrument Sans", size: 12 } } }, y: { min, max, grid: { color: p.grid }, border: { display: false }, ticks: { color: p.muted, font: { family: "Instrument Sans", size: 12 }, stepSize: step } } }
    };
  }
  function chartUnavailable(canvas) {
    if (!canvas || canvas.dataset.fallback) return;
    canvas.dataset.fallback = "1"; canvas.classList.add("hidden");
    const note = document.createElement("div"); note.className = "chart-fallback"; note.textContent = "Charts could not load. Check your internet connection and refresh the page.";
    canvas.parentElement.append(note);
  }
  function destroyChart(chart) { if (chart) chart.destroy(); return null; }
  function renderCharts() {
    const pCanvas = $("#performanceChart"), aCanvas = $("#attendanceChart");
    if (!window.Chart) { chartUnavailable(pCanvas); chartUnavailable(aCanvas); return; }
    const p = palette();
    if (pCanvas) {
      performanceChart = destroyChart(performanceChart);
      const maxLen = Math.min(6, Math.max(0, ...students.map(s => (s.assessments || []).length)));
      let labels, values;
      if (maxLen === 0) { labels = ["Current"]; values = [Math.round(average("marks"))]; }
      else {
        labels = Array.from({ length: maxLen }, (_, i) => `Test ${i + 1}`);
        values = labels.map((_, i) => { const v = students.map(s => s.assessments[i]).filter(Number.isFinite); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; });
      }
      performanceChart = new Chart(pCanvas, { type: "line", data: { labels, datasets: [
        { label: "Average score", data: values, borderColor: p.primary, backgroundColor: "rgba(75,76,240,.10)", fill: true, tension: .38, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: p.surface, pointBorderColor: p.primary, pointBorderWidth: 2, spanGaps: true },
        { label: "Target", data: labels.map(() => 75), borderColor: p.light, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false }
      ] }, options: baseChartOptions() });
    }
    if (aCanvas) {
      attendanceChart = destroyChart(attendanceChart);
      const ids = new Set(students.map(s => s.id)), groups = new Map();
      snapshots.filter(s => ids.has(s.studentId)).forEach(s => { const k = String(s.date).slice(0, 10); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(Number(s.attendance)); });
      const keys = [...groups.keys()].sort();
      const todayKey = new Date().toISOString().slice(0, 10);
      const labels = keys.map(k => new Date(k + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }));
      const values = keys.map(k => Math.round(groups.get(k).reduce((a, b) => a + b, 0) / groups.get(k).length));
      const now = Math.round(average("attendance"));
      if (keys.length && keys[keys.length - 1] === todayKey) { labels[labels.length - 1] = "Today"; values[values.length - 1] = now; }
      else { labels.push("Today"); values.push(now); }
      const lo = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 10);
      attendanceChart = new Chart(aCanvas, { type: "line", data: { labels, datasets: [{ label: "Attendance", data: values, borderColor: p.green, backgroundColor: "rgba(85,189,145,.12)", fill: true, tension: .4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: p.surface, pointBorderColor: p.green, pointBorderWidth: 2 }] }, options: baseChartOptions({ min: lo, max: 100, step: 20 }) });
    }
  }

  /* ---------- students ---------- */
  function renderStudents() {
    const query = ($("#studentSearch").value || "").trim().toLowerCase();
    const filter = $("#studentFilter").value, sort = $("#studentSort").value;
    let list = students.filter(s => `${s.name} ${s.id}`.toLowerCase().includes(query));
    if (filter !== "all") list = list.filter(s => studentStatus(s) === filter);
    list.sort((a, b) => sort === "attendance" ? a.attendance - b.attendance : sort === "marks" ? a.marks - b.marks : a.name.localeCompare(b.name));
    $("#studentRows").innerHTML = list.map(s => studentRow(s)).join("");
    $("#studentsEmpty").classList.toggle("hidden", list.length > 0);
    $("#directoryCount").textContent = students.length;
    $("#directoryAttendance").textContent = students.length ? `${average("attendance").toFixed(1)}%` : "—";
    $("#directoryScore").textContent = students.length ? `${average("marks").toFixed(1)}%` : "—";
  }
  function setSearch(value) { $("#studentSearch").value = value; $("#globalSearch").value = value; }

  /* ---------- early warning ---------- */
  function renderWarnings() {
    const support = students.filter(s => studentStatus(s) === "support");
    $("#warningCount").textContent = support.length;
    $("#attendanceWarningCount").textContent = students.filter(s => s.attendance < 75).length;
    $("#assignmentWarningCount").textContent = students.filter(s => s.assignments < 65).length;
    const list = $("#warningFilter").value === "all" ? students.slice().sort((a, b) => getSignals(b).length - getSignals(a).length || a.name.localeCompare(b.name)) : support;
    $("#warningCards").innerHTML = list.length ? list.map(s => {
      const reasons = getSignals(s), id = escapeHTML(s.id);
      const chips = reasons.length ? reasons.map(r => `<span class="reason-chip">${escapeHTML(r)}</span>`).join("") : `<span class="reason-chip reason-ok">No current indicators</span>`;
      return `<article class="warning-card"><div class="student-cell">${studentAvatar(s)}<div><h4>${escapeHTML(s.name)}</h4><p>${id} · ${escapeHTML(s.weakSubject || "Subject not specified")}</p></div></div><div class="warning-reasons">${chips}</div><div class="warning-actions"><button class="btn btn-secondary" data-action="details" data-id="${id}">Review</button><button class="btn btn-primary" data-action="plan" data-id="${id}">Make plan</button></div></article>`;
    }).join("") : `<div class="empty-state"><i class="fa-solid fa-heart-circle-check"></i><h3>No warning signals in this view</h3><p>Continue reviewing context and offering support as needed.</p></div>`;
  }

  /* ---------- selects ---------- */
  function populateStudentSelects() {
    ["simStudent", "progressStudent"].forEach(id => {
      const select = $(`#${id}`); if (!select) return;
      const old = select.value;
      select.innerHTML = students.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} (${escapeHTML(s.id)})</option>`).join("");
      if (students.some(s => s.id === old)) select.value = old;
    });
  }

  /* ---------- simulator ---------- */
  function selectedSimStudent() { return students.find(s => s.id === $("#simStudent").value) || students[0] || { id: "", attendance: 0, marks: 0, assignments: 0, assessments: [], weakSubject: "your focus subject", name: "Student" }; }
  function simValues() { return { minutes: Number($("#studyHours").value), assignmentGoal: Number($("#assignmentGoal").value), practices: Number($("#practiceSessions").value), revisions: Number($("#revisionSessions").value) }; }
  function updateSimulator() {
    const student = selectedSimStudent(), { minutes, assignmentGoal, practices, revisions } = simValues();
    $("#studyHoursValue").textContent = minutes; $("#assignmentGoalValue").textContent = assignmentGoal; $("#practiceSessionsValue").textContent = practices; $("#revisionSessionsValue").textContent = revisions;
    const total = minutes * 7;
    $("#weeklyStudy").textContent = `${Math.floor(total / 60)}h ${total % 60}m`;
    $("#weeklyPractice").textContent = `${practices} practice · ${revisions} revision`;
    $("#assignmentComparison").innerHTML = `${Number(student.assignments)}% <i class="fa-solid fa-arrow-right"></i> ${assignmentGoal}%`;
    $("#assignmentCurrentBar").style.width = `${clamp(student.assignments)}%`; $("#assignmentGoalBar").style.width = `${assignmentGoal}%`;
    $("#practiceComparison").innerHTML = `Not recorded <i class="fa-solid fa-arrow-right"></i> ${practices}`;
    $("#practiceCurrentBar").style.width = "0%"; $("#practiceGoalBar").style.width = `${practices / 7 * 100}%`;
    $("#scenarioDescription").textContent = `${student.name}'s recorded assignment completion is ${student.assignments}%. This scenario sets a ${assignmentGoal}% goal with ${minutes} focused minutes each day. These are planning choices, not a prediction of future marks.`;
    const roadmap = [
      { title: `Set aside ${minutes} focused minutes each day`, text: "Choose a realistic time and split it into smaller sessions when needed." },
      { title: `Work toward ${assignmentGoal}% assignment completion`, text: student.assignments < assignmentGoal ? `Start with one pending task and review the ${student.weakSubject || "priority"} work first.` : "Maintain your current routine and review task quality as well as completion." },
      { title: `Schedule ${practices} practice and ${revisions} revision sessions`, text: "Use practice to find gaps, then revise the topics that need another look." }
    ];
    $("#roadmapList").innerHTML = roadmap.map((r, i) => `<div class="roadmap-item"><span class="roadmap-number">${i + 1}</span><div><strong>${escapeHTML(r.title)}</strong><p>${escapeHTML(r.text)}</p></div></div>`).join("");
  }

  /* ---------- planner ---------- */
  function generatePlan({ student, subject, minutes, practices, revisions }) {
    const weak = subject || student.weakSubject || "Priority subject";
    const a = Number(student.assignments), att = Number(student.attendance);
    const mk = (topic, subj, duration, priority) => ({ topic, subject: subj, duration, priority });
    const pT = [`Solve 4–5 focused ${weak} questions`, `Practise exam-style ${weak} problems`, `Try a timed ${weak} mini-quiz`, `Work through examples from a tricky ${weak} topic`];
    const rT = [`Revise notes on one difficult ${weak} concept`, "Review mistakes from recent practice", `Summarise key ${weak} ideas on one page`, "Re-read feedback from your last assessment"];
    const practiceQ = Array.from({ length: practices }, (_, i) => mk(pT[i % pT.length], weak, minutes, "High"));
    const revisionQ = Array.from({ length: revisions }, (_, i) => mk(rT[i % rT.length], weak, Math.max(10, Math.round(minutes * .7)), "Medium"));
    const extraQ = [mk(a < 65 ? "Complete one pending assignment step" : "Review one assignment before submitting", "Assignment work", minutes, a < 65 ? "High" : "Medium")];
    if (a < 65) extraQ.push(mk("Finish the next pending assignment", "Assignment work", minutes, "High"));
    if (att < 75) extraQ.push(mk("Catch up on notes from a missed class", "Attendance recovery", Math.min(minutes, 30), "Medium"));
    const queues = [practiceQ, extraQ, revisionQ], ordered = [];
    while (queues.some(q => q.length)) queues.forEach(q => { if (q.length) ordered.push(q.shift()); });
    const stamp = Date.now();
    const result = ordered.map((t, i) => ({ ...t, day: DAYS[Math.floor(i * 6 / ordered.length)] }));
    result.push(mk("Reflect on progress and set next week's goal", "Weekly review", Math.min(20, minutes), "Low"));
    result[result.length - 1].day = "Sunday";
    return result.map((t, i) => ({ ...t, id: `task-${stamp}-${i}`, completed: false }));
  }
  function createPlan(opts) {
    if (!opts.student || !opts.student.id) { toast("Add a student first", "A student record helps personalise the plan."); return false; }
    if (tasks.some(t => !t.completed) && !window.confirm("Replace your current study plan with a new one?")) return false;
    tasks = generatePlan(opts);
    writeStore(KEYS.tasks, tasks);
    goTo("planner");
    toast("Study plan created", `A seven-day plan is ready for ${opts.student.name}.`);
    return true;
  }
  function renderTasks() {
    const done = tasks.filter(t => t.completed).length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    $("#plannerTaskCount").textContent = tasks.length; $("#plannerCompletedCount").textContent = done; $("#plannerCompletion").textContent = `${pct}%`; $("#plannerProgressBar").style.width = `${pct}%`;
    const ordered = tasks.slice().sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
    $("#taskList").innerHTML = ordered.map(t => `<div class="task-item ${t.completed ? "completed" : ""}"><input class="task-check" type="checkbox" data-task-toggle="${escapeHTML(t.id)}" ${t.completed ? "checked" : ""} aria-label="Mark ${escapeHTML(t.topic)} complete"><div class="task-main"><strong>${escapeHTML(t.topic)}</strong><small>${escapeHTML(t.subject)} · ${Number(t.duration) || 0} minutes</small></div><div class="task-meta"><span class="task-day">${escapeHTML(t.day)}</span><span class="priority-pill ${t.priority === "Low" ? "priority-low" : ""}">${escapeHTML(t.priority)}</span></div><button class="task-delete" data-task-delete="${escapeHTML(t.id)}" aria-label="Delete task"><i class="fa-solid fa-xmark"></i></button></div>`).join("");
    $("#plannerEmpty").classList.toggle("hidden", tasks.length > 0);
  }
  function rescheduleTasks() {
    const remaining = tasks.filter(t => !t.completed);
    if (!remaining.length) { toast("Nothing to reorganise", "All tasks are already complete."); return; }
    const todayIdx = (new Date().getDay() + 6) % 7, span = DAYS.length;
    remaining.forEach((t, i) => { t.day = DAYS[(todayIdx + Math.floor(i * span / remaining.length)) % span]; });
    writeStore(KEYS.tasks, tasks); renderTasks();
    toast("Plan reorganised", "Incomplete tasks have been spread across the coming week, starting today.");
  }
  function openPlanModal(studentId) {
    if (!students.length) { toast("Add a student first", "A student record helps personalise the plan."); return; }
    const select = $("#planStudent");
    select.innerHTML = students.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} (${escapeHTML(s.id)})</option>`).join("");
    select.value = students.some(s => s.id === studentId) ? studentId : students[0].id;
    const sim = simValues();
    $("#planMinutes").value = sim.minutes; $("#planPractices").value = sim.practices; $("#planRevisions").value = sim.revisions;
    syncPlanSubject(); $("#planFormError").classList.add("hidden");
    $("#planModalBackdrop").classList.remove("hidden"); select.focus();
  }
  function syncPlanSubject() { const s = students.find(x => x.id === $("#planStudent").value); $("#planSubject").value = s && s.weakSubject && s.weakSubject !== "Not specified" ? s.weakSubject : ""; }
  function submitPlanForm(event) {
    event.preventDefault();
    const student = students.find(s => s.id === $("#planStudent").value);
    const minutes = Number($("#planMinutes").value), practices = Number($("#planPractices").value), revisions = Number($("#planRevisions").value);
    const err = $("#planFormError");
    if (!student || !(minutes >= 10 && minutes <= 180) || !(practices >= 1 && practices <= 7) || !(revisions >= 0 && revisions <= 7) || ![minutes, practices, revisions].every(Number.isInteger)) {
      err.textContent = "Use whole numbers: 10–180 minutes, 1–7 practice sessions, and 0–7 revision sessions."; err.classList.remove("hidden"); return;
    }
    $("#planModalBackdrop").classList.add("hidden");
    createPlan({ student, subject: $("#planSubject").value.trim(), minutes, practices, revisions });
  }

  /* ---------- progress ---------- */
  function renderProgress() {
    const student = students.find(s => s.id === $("#progressStudent").value);
    const container = $(".progress-chart-container");
    if (!student) {
      ["progressAttendance", "progressMarks", "progressAssignments"].forEach(id => $(`#${id}`).textContent = "—");
      $("#snapshotCount").textContent = "0"; $("#progressEmpty").classList.remove("hidden"); container.classList.add("hidden");
      $("#progressTimeline").innerHTML = ""; progressChart = destroyChart(progressChart); return;
    }
    $("#progressAttendance").textContent = `${student.attendance}%`; $("#progressMarks").textContent = `${student.marks}%`; $("#progressAssignments").textContent = `${student.assignments}%`;
    const history = snapshots.filter(s => s.studentId === student.id).sort((a, b) => new Date(a.date) - new Date(b.date));
    $("#snapshotCount").textContent = history.length;
    const enough = history.length > 1;
    $("#progressEmpty").classList.toggle("hidden", enough); container.classList.toggle("hidden", !enough);
    progressChart = destroyChart(progressChart);
    if (enough) {
      if (!window.Chart) chartUnavailable($("#progressChart"));
      else {
        const p = palette();
        const labels = history.map(h => new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
        const ds = (label, key, color) => ({ label, data: history.map(h => h[key]), borderColor: color, backgroundColor: "transparent", tension: .35, borderWidth: 2, pointRadius: 3, pointBackgroundColor: p.surface, pointBorderColor: color, pointBorderWidth: 2 });
        progressChart = new Chart($("#progressChart"), { type: "line", data: { labels, datasets: [ds("Attendance", "attendance", p.green), ds("Score", "marks", p.primary), ds("Assignments", "assignments", p.amber)] }, options: baseChartOptions({ legend: true }) });
      }
    }
    const fmt = d => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    $("#progressTimeline").innerHTML = history.length ? history.slice().reverse().map(h => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>Snapshot recorded · ${fmt(h.date)}</strong><p>Attendance ${h.attendance}% · Score ${h.marks}% · Assignments ${h.assignments}%</p></div></div>`).join("") : `<div class="empty-state"><i class="fa-regular fa-clock"></i><h3>No snapshots recorded</h3><p>Use “Record snapshot” to save the current values as a point in time.</p></div>`;
  }
  function recordSnapshot() {
    const student = students.find(s => s.id === $("#progressStudent").value);
    if (!student) { toast("No student selected", "Add a student record before saving progress."); return; }
    snapshots.push({ id: `snap-${Date.now()}`, studentId: student.id, date: new Date().toISOString(), attendance: Number(student.attendance), marks: Number(student.marks), assignments: Number(student.assignments) });
    writeStore(KEYS.snapshots, snapshots); renderProgress(); toast("Snapshot recorded", `Saved current indicators for ${student.name}.`);
  }

  /* ---------- reports ---------- */
  function renderReport() {
    $("#reportDate").textContent = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const support = students.filter(s => studentStatus(s) === "support");
    $("#reportKpis").innerHTML = [["Students", students.length], ["Avg. attendance", students.length ? `${average("attendance").toFixed(1)}%` : "—"], ["Avg. score", students.length ? `${average("marks").toFixed(1)}%` : "—"], ["Review suggested", support.length]].map(([l, v]) => `<div class="report-kpi"><span>${escapeHTML(l)}</span><strong>${escapeHTML(v)}</strong></div>`).join("");
    $("#reportRows").innerHTML = support.length ? support.map(s => `<tr><td>${escapeHTML(s.name)} <small>(${escapeHTML(s.id)})</small></td><td>${s.attendance}%</td><td>${s.marks}%</td><td>${escapeHTML(getSignals(s).join("; "))}</td></tr>`).join("") : `<tr><td colspan="4">No students currently have support indicators.</td></tr>`;
  }
  function exportCSV() {
    const columns = ["id", "name", "attendance", "marks", "assignments", "weakSubject", "supportIndicators"];
    const rows = students.map(s => ({ ...s, supportIndicators: getSignals(s).join("; ") }));
    const esc = v => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
    const csv = [columns.map(esc).join(","), ...rows.map(r => columns.map(c => esc(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "learnix-student-report.csv"; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast("CSV exported", "The file contains the current demo records.");
  }

  /* ---------- added student-success tools ---------- */
  function localDateISO(date = new Date()) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  function dateFromISO(value) {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function dateDiffDays(value) {
    const due = dateFromISO(value), today = dateFromISO(localDateISO());
    return due && today ? Math.round((due - today) / DAY_MS) : null;
  }
  function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
    const d = dateFromISO(value);
    return d ? d.toLocaleDateString(undefined, options) : "Date not set";
  }
  function persistFeature(key, value) { writeStore(key, value); }
  function recordActivity(type, title, minutes = 0) {
    const now = new Date();
    activities.unshift({ id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, title: String(title || "Study activity").slice(0, 140), minutes: Math.max(0, Number(minutes) || 0), createdAt: now.toISOString(), date: localDateISO(now) });
    activities = activities.slice(0, 500);
    persistFeature(KEYS.activities, activities);
    if (activePage === "consistency") renderConsistency();
  }
  function setDateDefaults() {
    const today = localDateISO();
    ["deadlineDate", "gapDate", "marksDate"].forEach(id => { const el = $(`#${id}`); if (el && !el.value) el.value = today; });
    const examDate = $("#examDate");
    if (examDate) {
      examDate.min = today;
      if (!examDate.value) { const d = new Date(); d.setDate(d.getDate() + 7); examDate.value = localDateISO(d); }
    }
  }

  const quizBank = {
    "Programming": [
      { q: "Which C operator gives the address of a variable?", options: ["*", "&", "%", "#"], answer: 1, explanation: "The ampersand (&) is the address-of operator." },
      { q: "Which data structure follows LIFO?", options: ["Queue", "Tree", "Stack", "Graph"], answer: 2, explanation: "A stack removes the most recently added item first." },
      { q: "What is the usual time complexity of binary search on a sorted array?", options: ["O(n)", "O(n²)", "O(log n)", "O(1) always"], answer: 2, explanation: "Binary search halves the remaining search interval after each comparison." },
      { q: "Which function allocates memory dynamically in C?", options: ["printf()", "malloc()", "strlen()", "scanf()"], answer: 1, explanation: "malloc() requests a block of memory from the heap and returns a pointer." },
      { q: "Which loop checks its condition before every iteration?", options: ["do-while only", "while", "Neither", "Both while and for"], answer: 3, explanation: "while and for are entry-controlled loops; do-while checks after the body." },
      { q: "What is the index of the first element in a C array?", options: ["0", "1", "-1", "Depends on array size"], answer: 0, explanation: "C arrays use zero-based indexing." }
    ],
    "Mathematics": [
      { q: "What is the derivative of x²?", options: ["x", "2x", "x³", "2"], answer: 1, explanation: "By the power rule, d(xⁿ)/dx = nxⁿ⁻¹." },
      { q: "What is the determinant of [[1, 2], [3, 4]]?", options: ["2", "-2", "10", "-10"], answer: 1, explanation: "For a 2×2 matrix, ad − bc = 1×4 − 2×3 = −2." },
      { q: "The integral of 1 with respect to x is…", options: ["0", "x + C", "1/x + C", "eˣ + C"], answer: 1, explanation: "The antiderivative of 1 is x, plus a constant of integration." },
      { q: "If A is an identity matrix, then AI equals…", options: ["A", "0", "I + A", "A² + I"], answer: 0, explanation: "Multiplying a compatible matrix by the identity matrix leaves it unchanged." },
      { q: "What is sin²θ + cos²θ?", options: ["0", "1", "2", "tan θ"], answer: 1, explanation: "This is the fundamental Pythagorean trigonometric identity." },
      { q: "A matrix is singular when its determinant is…", options: ["1", "Positive", "0", "Negative"], answer: 2, explanation: "A square matrix is singular when its determinant equals zero." }
    ],
    "DBMS": [
      { q: "What is the main purpose of a primary key?", options: ["Allow duplicate rows", "Uniquely identify each row", "Encrypt a table", "Sort every query"], answer: 1, explanation: "A primary key uniquely identifies each record and cannot contain NULL values." },
      { q: "A foreign key is used to…", options: ["Link related tables", "Compress a database", "Create duplicate rows", "Replace every index"], answer: 0, explanation: "A foreign key refers to a candidate/primary key in another or the same table." },
      { q: "Which SQL command retrieves data?", options: ["FETCH ALL TABLES only", "SELECT", "MAKE", "CHANGE ROW"], answer: 1, explanation: "SELECT queries data from one or more tables or views." },
      { q: "Which normal form targets partial dependency on a composite key?", options: ["1NF", "2NF", "3NF", "BCNF only"], answer: 1, explanation: "Second Normal Form removes partial dependency on part of a candidate key." },
      { q: "In ACID, the A stands for…", options: ["Accuracy", "Atomicity", "Availability", "Access"], answer: 1, explanation: "Atomicity means a transaction completes fully or is rolled back fully." },
      { q: "Which clause filters rows before grouping?", options: ["WHERE", "ORDER BY", "HAVING", "DISTINCT"], answer: 0, explanation: "WHERE filters rows before GROUP BY; HAVING filters groups after aggregation." }
    ],
    "Computer Organization": [
      { q: "Which unit performs arithmetic and logical operations?", options: ["CU", "ALU", "RAM", "SMPS"], answer: 1, explanation: "The Arithmetic Logic Unit performs arithmetic and Boolean operations." },
      { q: "How many bits are in one byte?", options: ["4", "8", "16", "32"], answer: 1, explanation: "A byte is made up of eight bits in modern standard computing." },
      { q: "A multiplexer is commonly used to…", options: ["Select one input for an output", "Store a program permanently", "Cool a CPU", "Convert AC to DC"], answer: 0, explanation: "A multiplexer selects one of multiple inputs using select lines." },
      { q: "Which memory is typically volatile?", options: ["ROM", "SSD", "RAM", "Blu-ray"], answer: 2, explanation: "RAM normally loses its stored contents when power is removed." },
      { q: "What does the control unit primarily do?", options: ["Coordinate instruction execution", "Print documents", "Store all files forever", "Generate electricity"], answer: 0, explanation: "The control unit directs operations and control signals inside the CPU." },
      { q: "The binary representation uses which base?", options: ["2", "8", "10", "16"], answer: 0, explanation: "Binary uses only the digits 0 and 1, so its base is two." }
    ],
    "Environmental Studies": [
      { q: "Which is a renewable energy source?", options: ["Coal", "Petroleum", "Solar energy", "Natural gas"], answer: 2, explanation: "Solar energy is replenished naturally on human timescales." },
      { q: "Which gas is a major contributor to human-caused global warming?", options: ["Oxygen", "Carbon dioxide", "Helium", "Neon"], answer: 1, explanation: "Carbon dioxide is a key long-lived greenhouse gas from fossil-fuel use and land-use change." },
      { q: "Biodiversity means…", options: ["Variety of life", "Only forest area", "Air temperature", "A type of fuel"], answer: 0, explanation: "Biodiversity includes variation within species, between species, and across ecosystems." },
      { q: "Which action best supports the 3Rs?", options: ["Buy and discard more", "Reduce, reuse, recycle", "Burn mixed waste", "Use single-use items"], answer: 1, explanation: "Reduce, reuse, and recycle can limit resource use and waste generation." },
      { q: "What is sustainable development?", options: ["Use all resources quickly", "Meet present needs without harming future generations' ability to meet theirs", "Stop all industry", "Only build cities"], answer: 1, explanation: "The common definition balances present needs with future generations' needs." },
      { q: "Which of these is biodegradable?", options: ["Banana peel", "Glass bottle", "Aluminium can", "Plastic straw"], answer: 0, explanation: "Organic material such as banana peels can be broken down by microorganisms." }
    ]
  };
  const quizGeneral = [
    { q: "Which method is usually most effective for checking recall?", options: ["Re-reading only", "Self-testing without notes", "Highlighting every line", "Studying while distracted"], answer: 1, explanation: "Retrieval practice makes you actively recall information and reveals gaps." },
    { q: "A useful revision session should usually end with…", options: ["No review", "A short check of what you remember", "More tabs open", "Skipping mistakes"], answer: 1, explanation: "A short exit check helps you identify the next topic to revisit." },
    { q: "When a topic feels difficult, a sensible first step is to…", options: ["Avoid it forever", "Break it into a small subtopic and practise", "Study five topics at once", "Delete your notes"], answer: 1, explanation: "Small, specific goals make difficult work easier to start and measure." },
    { q: "During a timed practice test, what should you do if one question stalls you?", options: ["Spend the entire time on it", "Mark it and return if time remains", "Submit immediately", "Ignore all instructions"], answer: 1, explanation: "Time management means allocating effort and returning to marked questions later." }
  ];

  function renderQuizPage() {
    if (activeQuiz) renderQuizQuestions();
    else {
      $("#quizQuestions").innerHTML = `<div class="empty-feature"><i class="fa-solid fa-circle-question"></i><p>Choose a subject and start a practice quiz to see questions here.</p></div>`;
      $("#quizSubmitActions").classList.add("hidden");
      if (quizAttempts.length) {
        const last = quizAttempts[0];
        $("#quizResults").classList.remove("hidden");
        $("#quizResults").innerHTML = `<span class="result-overline">Last practice result</span><strong>${last.score}% · ${last.correct}/${last.total} correct</strong><p>${escapeHTML(last.subject)} · ${formatDate(last.date)}. Start a new quiz to keep practising.</p>`;
      } else $("#quizResults").classList.add("hidden");
    }
    renderExamRoadmap();
  }
  function startQuiz(event) {
    event.preventDefault();
    const subject = $("#quizSubject").value, count = Number($("#quizCount").value);
    const specific = (quizBank[subject] || []).map(q => ({ ...q, subject }));
    const pool = [...specific, ...quizGeneral.map(q => ({ ...q, subject: "Study skills" }))].sort(() => Math.random() - 0.5);
    const chosen = pool.slice(0, Math.min(count, pool.length));
    activeQuiz = { id: `quiz-${Date.now()}`, subject, questions: chosen, submitted: false, answers: {} };
    $("#quizResults").classList.add("hidden");
    $("#quizWorkspaceSubtitle").textContent = `${chosen.length} questions · ${subject} · Answers and explanations appear after submission.`;
    renderQuizQuestions();
    toast("Quiz ready", `${chosen.length} practice questions are ready. Take your time.`);
  }
  function renderQuizQuestions() {
    if (!activeQuiz) return;
    const qlist = activeQuiz.questions;
    $("#quizQuestions").innerHTML = qlist.map((q, i) => `<article class="quiz-question ${activeQuiz.submitted ? (Number(activeQuiz.answers[i]) === q.answer ? "answer-correct" : "answer-review") : ""}"><div class="question-heading"><span>QUESTION ${i + 1}</span><small>${escapeHTML(q.subject || activeQuiz.subject)}</small></div><h4>${escapeHTML(q.q)}</h4><div class="answer-options">${q.options.map((o, j) => `<label class="answer-option ${activeQuiz.submitted && j === q.answer ? "answer-key" : ""}"><input type="radio" name="quizAnswer${i}" value="${j}" ${Number(activeQuiz.answers[i]) === j ? "checked" : ""} ${activeQuiz.submitted ? "disabled" : ""}><span>${escapeHTML(o)}</span></label>`).join("")}</div>${activeQuiz.submitted ? `<div class="answer-explanation"><strong>${Number(activeQuiz.answers[i]) === q.answer ? "Correct" : `Correct answer: ${escapeHTML(q.options[q.answer])}`}</strong><p>${escapeHTML(q.explanation)}</p></div>` : ""}</article>`).join("");
    $("#quizSubmitActions").classList.toggle("hidden", !activeQuiz || activeQuiz.questions.length === 0);
    $("#submitQuizButton").classList.toggle("hidden", Boolean(activeQuiz.submitted));
    $("#restartQuizButton").classList.toggle("hidden", !activeQuiz.submitted);
    if (activeQuiz.submitted) $("#quizWorkspaceSubtitle").textContent = "Review explanations below, then try another quiz when ready.";
  }
  function submitQuiz(event) {
    event.preventDefault();
    if (!activeQuiz || activeQuiz.submitted) return;
    activeQuiz.questions.forEach((q, i) => {
      const selected = $(`input[name="quizAnswer${i}"]:checked`);
      activeQuiz.answers[i] = selected ? Number(selected.value) : -1;
    });
    const correct = activeQuiz.questions.reduce((sum, q, i) => sum + (Number(activeQuiz.answers[i]) === q.answer ? 1 : 0), 0);
    const attempt = { id: activeQuiz.id, subject: activeQuiz.subject, date: new Date().toISOString(), total: activeQuiz.questions.length, correct, score: Math.round(correct / activeQuiz.questions.length * 100) };
    activeQuiz.submitted = true;
    quizAttempts.unshift(attempt); quizAttempts = quizAttempts.slice(0, 100); persistFeature(KEYS.quizAttempts, quizAttempts);
    recordActivity("quiz", `Completed ${activeQuiz.subject} quiz (${correct}/${activeQuiz.questions.length})`, activeQuiz.questions.length * 2);
    $("#quizResults").classList.remove("hidden");
    const message = attempt.score >= 80 ? "Strong recall. Review the missed questions to reinforce the details." : attempt.score >= 50 ? "Good diagnostic practice. Revisit the explanation cards for missed questions." : "This quiz has highlighted topics to review. Take one small section at a time.";
    $("#quizResults").innerHTML = `<span class="result-overline">Practice complete</span><strong>${attempt.score}% · ${correct}/${activeQuiz.questions.length} correct</strong><p>${message}</p>`;
    renderQuizQuestions(); toast("Quiz submitted", `Score: ${attempt.score}%. Your result is saved locally.`);
  }
  function renderExamRoadmap() {
    const plan = examPlans[0];
    if (!plan) {
      $("#examRoadmapSubtitle").textContent = "Your roadmap will appear here after you add an exam date.";
      $("#examRoadmap").innerHTML = `<div class="empty-feature"><i class="fa-solid fa-calendar-check"></i><p>Set a date and we will break revision into manageable phases.</p></div>`;
      return;
    }
    const diff = dateDiffDays(plan.date);
    $("#examRoadmapSubtitle").textContent = `${plan.subject} · ${diff < 0 ? "Date has passed" : diff === 0 ? "Exam day is today" : `${diff} day${diff === 1 ? "" : "s"} remaining`} · ${plan.minutes} minutes/day`;
    const phases = diff <= 1 ? [
      ["Final recall", "Review your own summary sheet and key formulas.", "15–20 min"],
      ["Targeted practice", "Attempt a short set of high-value questions; check mistakes.", "20–30 min"],
      ["Prepare and rest", "Pack what you need and protect sleep. Avoid a last-minute all-nighter.", "10 min"]
    ] : diff <= 3 ? [
      ["Map the syllabus", "List the examinable units and mark the topics you find hardest.", `${Math.round(plan.minutes * .25)} min`],
      ["Active recall", "Practise questions from the two highest-priority topics.", `${Math.round(plan.minutes * .45)} min`],
      ["Review errors", "Correct mistakes and revisit only the concepts that caused them.", `${Math.round(plan.minutes * .3)} min`]
    ] : [
      ["Build understanding", "Split the syllabus into small topic blocks and revise one at a time.", `${Math.round(plan.minutes * .4)} min/day`],
      ["Practise from memory", "Use quizzes, worked examples, and exam-style questions.", `${Math.round(plan.minutes * .4)} min/day`],
      ["Simulate and refine", "Complete a timed practice set, then revise repeated mistakes.", `${Math.round(plan.minutes * .2)} min/day`]
    ];
    $("#examRoadmap").innerHTML = phases.map((p, i) => `<div class="roadmap-step"><span class="roadmap-step-number">${i + 1}</span><div><strong>${escapeHTML(p[0])}</strong><p>${escapeHTML(p[1])}</p></div><span class="roadmap-duration">${escapeHTML(p[2])}</span></div>`).join("") + `<p class="field-hint"><i class="fa-solid fa-lightbulb"></i> Tip: use your official syllabus to choose the exact topics inside each phase.</p>`;
  }
  function submitExamPlan(event) {
    event.preventDefault();
    const subject = $("#examSubject").value.trim(), date = $("#examDate").value, minutes = Number($("#examMinutes").value);
    if (!subject || !date || dateDiffDays(date) === null || dateDiffDays(date) < 0) { toast("Check your exam date", "Choose today or a future date and enter your subject."); return; }
    examPlans.unshift({ id: `exam-${Date.now()}`, subject, date, minutes, createdAt: new Date().toISOString() });
    examPlans = examPlans.slice(0, 20); persistFeature(KEYS.examPlans, examPlans); renderExamRoadmap();
    toast("Exam roadmap created", `Revision phases are ready for ${subject}.`);
  }

  function deadlineStatus(item) {
    if (item.completed) return { label: "Completed", cls: "deadline-done", text: "Completed" };
    const diff = dateDiffDays(item.dueDate);
    if (diff < 0) return { label: "Overdue", cls: "deadline-overdue", text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue` };
    if (diff === 0) return { label: "Due today", cls: "deadline-today", text: "Due today" };
    if (diff === 1) return { label: "Due tomorrow", cls: "deadline-soon", text: "Due tomorrow" };
    return { label: "Upcoming", cls: "deadline-upcoming", text: `${diff} days left` };
  }
  function renderDeadlines() {
    const open = deadlines.filter(d => !d.completed), todaySoon = open.filter(d => { const n = dateDiffDays(d.dueDate); return n !== null && n >= 0 && n <= 2; });
    $("#deadlineTotal").textContent = deadlines.length; $("#deadlineSoon").textContent = todaySoon.length; $("#deadlineDone").textContent = deadlines.filter(d => d.completed).length;
    const filter = $("#deadlineFilter").value;
    let list = deadlines.filter(d => filter === "all" || (filter === "done" ? d.completed : !d.completed));
    list.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || String(a.title).localeCompare(String(b.title)));
    $("#deadlineList").innerHTML = list.length ? list.map(d => {
      const st = deadlineStatus(d), due = dateFromISO(d.dueDate);
      const dayLabel = due ? due.toLocaleDateString(undefined, { day: "2-digit" }) : "—";
      const monthLabel = due ? due.toLocaleDateString(undefined, { month: "short" }).toUpperCase() : "DATE";
      return `<article class="deadline-item ${d.completed ? "completed" : ""}"><div class="deadline-date"><strong>${escapeHTML(dayLabel)}</strong><span>${escapeHTML(monthLabel)}</span></div><div class="deadline-copy"><div class="deadline-title-row"><strong>${escapeHTML(d.title)}</strong><span class="priority-pill ${d.priority === "High" ? "priority-high" : d.priority === "Low" ? "priority-low" : ""}">${escapeHTML(d.priority)}</span></div><p>${escapeHTML(d.subject)}${d.notes ? ` · ${escapeHTML(d.notes)}` : ""}</p><span class="deadline-status ${st.cls}"><i class="fa-regular fa-clock"></i> ${escapeHTML(st.text)}</span></div><div class="deadline-actions">${!d.completed ? `<button class="btn btn-secondary btn-sm" data-deadline-done="${escapeHTML(d.id)}"><i class="fa-solid fa-check"></i> Done</button>` : `<span class="completed-label"><i class="fa-solid fa-check-circle"></i> Done</span>`}<button class="icon-button tiny" data-deadline-delete="${escapeHTML(d.id)}" aria-label="Delete ${escapeHTML(d.title)}"><i class="fa-solid fa-trash"></i></button></div></article>`;
    }).join("") : `<div class="empty-feature"><i class="fa-solid fa-inbox"></i><p>${filter === "done" ? "No completed assignments yet." : filter === "all" ? "No assignments saved. Add a deadline to get started." : "Nothing left on your to-do list. Add an assignment when one comes up."}</p></div>`;
  }
  function addDeadline(event) {
    event.preventDefault();
    const item = { id: `due-${Date.now()}`, title: $("#deadlineTitle").value.trim(), subject: $("#deadlineSubject").value.trim(), dueDate: $("#deadlineDate").value, priority: $("#deadlinePriority").value, notes: $("#deadlineNotes").value.trim(), completed: false, createdAt: new Date().toISOString() };
    if (!item.title || !item.subject || !item.dueDate) return;
    deadlines.push(item); persistFeature(KEYS.deadlines, deadlines); $("#deadlineForm").reset(); setDateDefaults(); renderDeadlines();
    toast("Deadline added", `${item.title} is now on your assignment board.`); checkDeadlineReminders(false);
  }
  function checkDeadlineReminders(force = false) {
    const seen = readStore(KEYS.reminderSeen, {}, v => v && typeof v === "object");
    const today = localDateISO();
    const alerts = deadlines.filter(d => !d.completed && dateDiffDays(d.dueDate) !== null && dateDiffDays(d.dueDate) <= 2);
    const fresh = alerts.filter(d => force || seen[d.id] !== today);
    if (!fresh.length) return;
    fresh.slice(0, 3).forEach(d => {
      const st = deadlineStatus(d);
      toast(st.label === "Overdue" ? "Assignment overdue" : "Deadline reminder", `${d.title} · ${st.text}. Open Assignment deadlines to review it.`);
      try { if ("Notification" in window && Notification.permission === "granted") new Notification(st.label === "Overdue" ? "Assignment overdue" : "Upcoming assignment", { body: `${d.title} · ${st.text}` }); } catch (e) { /* notifications are optional */ }
      seen[d.id] = today;
    });
    persistFeature(KEYS.reminderSeen, seen);
  }
  async function enableBrowserNotifications() {
    if (!("Notification" in window)) { toast("Browser notifications unavailable", "Use the in-app deadline board for reminders in this browser."); return; }
    try {
      const result = await Notification.requestPermission();
      toast(result === "granted" ? "Browser reminders enabled" : "Permission not granted", result === "granted" ? "Upcoming deadlines can now trigger browser notifications while this page is open." : "In-app reminders will continue to work.");
    } catch (error) { toast("Could not enable notifications", "Your browser may require the app to run on localhost or HTTPS."); }
  }

  const opportunityCatalog = [
    { id: "mlh", title: "MLH Hackathons", type: "Hackathon directory", tags: ["hackathons", "competitions"], skills: ["programming", "web", "design", "teamwork"], level: "beginner", hours: 4, description: "Explore student hackathons and build a project with a team.", url: "https://mlh.io/", fit: "Team project" },
    { id: "devpost", title: "Devpost Hackathons", type: "Build challenge", tags: ["hackathons", "competitions", "research"], skills: ["programming", "ai", "web", "design", "data"], level: "beginner", hours: 3, description: "Find themed build challenges to turn an idea into a demo.", url: "https://devpost.com/hackathons", fit: "Portfolio project" },
    { id: "goodfirst", title: "Good First Issues", type: "Open-source contribution", tags: ["open-source", "internships"], skills: ["git", "github", "programming", "web", "documentation"], level: "beginner", hours: 2, description: "Practise contribution workflow on repositories that label beginner-friendly issues.", url: "https://github.com/topics/good-first-issue", fit: "First contribution" },
    { id: "gsoc", title: "Google Summer of Code", type: "Open-source program", tags: ["open-source", "internships", "research"], skills: ["programming", "git", "python", "java", "web"], level: "intermediate", hours: 10, description: "Explore a mentored open-source program and review its published eligibility rules.", url: "https://summerofcode.withgoogle.com/", fit: "Mentored coding" },
    { id: "aicte", title: "AICTE Internship Portal", type: "Internship directory", tags: ["internships"], skills: ["programming", "web", "python", "data", "communication"], level: "beginner", hours: 5, description: "Browse internship listings and verify requirements, dates, and eligibility on the portal.", url: "https://internship.aicte-india.org/", fit: "Career exposure" },
    { id: "spaceapps", title: "NASA Space Apps Challenge", type: "Global innovation challenge", tags: ["hackathons", "competitions", "research", "volunteering"], skills: ["data", "design", "programming", "science", "teamwork"], level: "beginner", hours: 5, description: "Collaborate on open challenge prompts using science, data, design, and coding.", url: "https://www.spaceappschallenge.org/", fit: "Cross-functional team" },
    { id: "kaggle", title: "Kaggle Competitions", type: "Data & AI challenges", tags: ["competitions", "research"], skills: ["python", "data", "ai", "machine learning", "statistics"], level: "beginner", hours: 4, description: "Build data skills through competitions and notebook-based experiments.", url: "https://www.kaggle.com/competitions", fit: "Data portfolio" },
    { id: "outreachy", title: "Outreachy", type: "Internship program", tags: ["internships", "open-source"], skills: ["programming", "git", "web", "documentation"], level: "intermediate", hours: 10, description: "Review the program's eligibility, timelines, and contribution process before applying.", url: "https://www.outreachy.org/", fit: "Structured contribution" },
    { id: "codechef", title: "CodeChef Contests", type: "Coding competitions", tags: ["competitions", "hackathons"], skills: ["programming", "algorithms", "c", "java", "python"], level: "beginner", hours: 2, description: "Practise problem solving in time-boxed contests and review editorials after attempts.", url: "https://www.codechef.com/contests", fit: "Problem-solving practice" },
    { id: "nptel", title: "NPTEL Learning", type: "Courses & certifications", tags: ["scholarships", "research", "internships"], skills: ["programming", "math", "data", "science"], level: "beginner", hours: 3, description: "Explore structured courses and check certification dates, fees, and criteria.", url: "https://nptel.ac.in/", fit: "Skill development" }
  ];
  function renderOpportunityPrefs() {
    const interests = opportunityPrefs.interests || [];
    $$('input[name="oppInterest"]').forEach(input => { input.checked = interests.includes(input.value); });
    $("#opportunitySkills").value = opportunityPrefs.skills || ""; $("#opportunityLevel").value = opportunityPrefs.level || "beginner"; $("#opportunityHours").value = String(opportunityPrefs.hours || 5);
    matchOpportunities(false);
  }
  function matchOpportunities(showToast = true) {
    const interests = $$('input[name="oppInterest"]:checked').map(x => x.value);
    const skillsRaw = $("#opportunitySkills").value.toLowerCase().split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
    const level = $("#opportunityLevel").value, hours = Number($("#opportunityHours").value);
    opportunityPrefs = { interests, skills: $("#opportunitySkills").value.trim(), level, hours }; persistFeature(KEYS.opportunityPrefs, opportunityPrefs);
    if (!interests.length) {
      $("#opportunitySubtitle").textContent = "Choose at least one interest to see relevant options.";
      $("#opportunityResults").innerHTML = `<div class="empty-feature"><i class="fa-solid fa-compass"></i><p>Select one or more interests to generate matches.</p></div>`; return;
    }
    const list = opportunityCatalog.map(item => {
      const tags = item.tags.filter(t => interests.includes(t));
      const matchingSkills = skillsRaw.filter(skill => item.skills.some(k => k.includes(skill) || skill.includes(k) || skill === "js" && k === "javascript"));
      const interestPoints = Math.min(42, tags.length * 21);
      const skillPoints = Math.min(28, matchingSkills.length * 14);
      const levelFit = item.level === "beginner" || level !== "beginner" ? 15 : 5;
      const timeFit = hours >= item.hours ? 15 : Math.max(0, Math.round(15 * hours / item.hours));
      const score = Math.min(98, interestPoints + skillPoints + levelFit + timeFit);
      return { ...item, score, matchedTags: tags, matchingSkills, timeFit };
    }).filter(x => x.matchedTags.length).sort((a, b) => {
      if ($("#opportunitySort").value === "time") return a.hours - b.hours || b.score - a.score;
      return b.score - a.score || a.hours - b.hours;
    });
    $("#opportunitySubtitle").textContent = `${list.length} opportunities matched against your selected interests and skills. This is a relevance score, not an eligibility decision.`;
    $("#opportunityResults").innerHTML = list.map(item => `<article class="opportunity-card"><div class="opportunity-card-top"><span class="opportunity-type">${escapeHTML(item.type)}</span><span class="match-score"><i class="fa-solid fa-bullseye"></i> ${item.score}% match</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><div class="opportunity-meta"><span><i class="fa-regular fa-clock"></i> ~${item.hours} hrs/week</span><span><i class="fa-solid fa-seedling"></i> ${item.level === "beginner" ? "Beginner-friendly" : "Some prior experience"}</span></div><div class="opportunity-tags">${item.matchedTags.map(t => `<span>${escapeHTML(t.replace(/-/g, " "))}</span>`).join("")}${item.matchingSkills.slice(0, 2).map(t => `<span class="skill-tag">${escapeHTML(t)}</span>`).join("")}</div><a class="btn btn-secondary btn-sm opportunity-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Explore official website <i class="fa-solid fa-arrow-up-right-from-square"></i></a></article>`).join("") || `<div class="empty-feature"><i class="fa-solid fa-compass"></i><p>No catalogue entries match those interests. Try adding another interest category.</p></div>`;
    if (showToast) toast("Matches refreshed", `${list.length} opportunity types have been ranked for your profile.`);
  }

  function renderMarks() {
    const avg = marksEntries.length ? marksEntries.reduce((sum, m) => sum + (m.obtained / m.maximum * 100), 0) / marksEntries.length : 0;
    $("#marksAverage").textContent = marksEntries.length ? `${avg.toFixed(1)}%` : "—";
    $("#marksCount").textContent = marksEntries.length;
    const groups = new Map();
    marksEntries.forEach(m => { const key = m.subject; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m.obtained / m.maximum * 100); });
    const best = [...groups.entries()].map(([subject, values]) => ({ subject, score: values.reduce((a, b) => a + b, 0) / values.length })).sort((a, b) => b.score - a.score)[0];
    $("#marksBestSubject").textContent = best ? best.subject : "—";
    const currentFilter = $("#marksSubjectFilter").value || "all";
    const subjects = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    $("#marksSubjectFilter").innerHTML = `<option value="all">All subjects</option>${subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("")}`;
    $("#marksSubjectFilter").value = subjects.includes(currentFilter) ? currentFilter : "all";
    const list = marksEntries.filter(m => $("#marksSubjectFilter").value === "all" || m.subject === $("#marksSubjectFilter").value).slice().sort((a, b) => b.date.localeCompare(a.date));
    $("#marksHistory").innerHTML = list.length ? list.map(m => {
      const pct = Math.round(m.obtained / m.maximum * 100);
      return `<article class="marks-row"><div class="marks-icon"><i class="fa-solid fa-file-pen"></i></div><div class="marks-row-main"><strong>${escapeHTML(m.title)}</strong><p>${escapeHTML(m.subject)} · ${escapeHTML(formatDate(m.date))}</p><div class="progress-track"><span style="width:${pct}%"></span></div></div><div class="marks-score"><strong>${m.obtained}/${m.maximum}</strong><span>${pct}%</span></div><button class="icon-button tiny" data-marks-delete="${escapeHTML(m.id)}" aria-label="Delete assessment"><i class="fa-solid fa-trash"></i></button></article>`;
    }).join("") : `<div class="empty-feature"><i class="fa-solid fa-chart-simple"></i><p>No marks recorded${$("#marksSubjectFilter").value !== "all" ? " for this subject" : " yet"}. Add your latest assessment above.</p></div>`;
  }
  function addMarks(event) {
    event.preventDefault();
    const obtained = Number($("#marksObtained").value), maximum = Number($("#marksMaximum").value);
    if (!(maximum > 0) || obtained < 0 || obtained > maximum) { toast("Check the marks", "Marks obtained must be between zero and the maximum marks."); return; }
    const entry = { id: `mark-${Date.now()}`, title: $("#marksTitle").value.trim(), subject: $("#marksSubject").value.trim(), obtained, maximum, date: $("#marksDate").value || localDateISO(), createdAt: new Date().toISOString() };
    marksEntries.unshift(entry); persistFeature(KEYS.marks, marksEntries); $("#marksForm").reset(); setDateDefaults(); renderMarks();
    recordActivity("marks", `Recorded result: ${entry.subject} (${Math.round(obtained / maximum * 100)}%)`, 0);
    toast("Assessment saved", `${entry.title} was added to your marks history.`);
  }
  function calculateTargetScore(event) {
    event.preventDefault();
    const current = Number($("#targetCurrent").value), target = Number($("#targetFinal").value), weight = Number($("#targetCompletedWeight").value);
    if ([current, target, weight].some(n => !Number.isFinite(n) || n < 0 || n > 100) || weight <= 0 || weight >= 100) { toast("Check calculator values", "Scores must be 0–100 and completed weight must be between 1 and 99."); return; }
    const needed = (target - current * weight / 100) / (1 - weight / 100);
    const result = $("#targetScoreResult"); result.classList.remove("result-success", "result-warning", "result-impossible");
    if (needed > 100) result.classList.add("result-impossible"); else if (needed <= 0) result.classList.add("result-success"); else result.classList.add("result-warning");
    result.innerHTML = `<span>Average needed on the remaining ${100 - weight}%</span><strong>${needed <= 0 ? "Target already secured on this estimate" : needed > 100 ? `${needed.toFixed(1)}% · above 100%` : `${needed.toFixed(1)}% needed`}</strong><p>${needed > 100 ? "This target is not mathematically reachable from these inputs alone. Consider adjusting your goal or asking your instructor how the assessment is weighted." : needed <= 0 ? "Based on the entered weights, your current score already meets the target estimate. Keep reviewing and verify the official grading formula." : "This is a weighted-score estimate, not a guarantee. Check the course grading rules before making decisions."}</p>`;
  }

  function buildGapRecommendation(minutes, energy, subject) {
    if (energy === "low") return { title: minutes < 15 ? "Take a clean reset" : "Light review or recovery", body: minutes < 15 ? "Use the slot to transition, hydrate, or breathe before your next commitment." : "Try a low-effort flashcard review, organise notes, or take a proper short break if you need it." };
    if (minutes < 10) return { title: "Protect the transition buffer", body: "This gap is too short for deep work. Check your next class, get water, and pick one tiny task for later." };
    if (minutes <= 20) return { title: "Quick recall sprint", body: `Review 5–10 flashcards or explain one ${subject || "priority"} concept from memory. Stop when the gap ends.` };
    if (minutes <= 40) return { title: "Focused practice block", body: `Solve 3–5 questions, revise one small ${subject || "priority"} topic, or complete a short coding exercise. Finish with a two-minute check.` };
    return { title: "Deep-work mini-session", body: `Use one focused block for ${subject || "your most important topic"}, then reserve the final five minutes to note progress and the next step.` };
  }
  function submitGap(event) {
    event.preventDefault();
    const date = $("#gapDate").value, start = $("#gapStart").value, end = $("#gapEnd").value, subject = $("#gapSubject").value.trim() || "Priority study topic", energy = $("#gapEnergy").value;
    if (!date || !start || !end) { toast("Complete the time slot", "Choose a date, start time, and end time."); return; }
    const toMin = v => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
    const minutes = toMin(end) - toMin(start);
    if (minutes <= 0) { toast("Check the time range", "The end time must be later than the start time on the same day."); return; }
    const recommendation = buildGapRecommendation(minutes, energy, subject);
    const slot = { id: `gap-${Date.now()}`, date, start, end, minutes, subject, energy, title: recommendation.title, recommendation: recommendation.body, completed: false, createdAt: new Date().toISOString() };
    gapSlots.push(slot); persistFeature(KEYS.gaps, gapSlots); renderGapSlots();
    const result = $("#gapRecommendation"); result.classList.remove("hidden"); result.innerHTML = `<span class="result-overline">${minutes}-minute gap · ${energy} energy</span><strong>${escapeHTML(recommendation.title)}</strong><p>${escapeHTML(recommendation.body)}</p><button class="btn btn-secondary btn-sm" type="button" data-jump-gaps="${escapeHTML(slot.id)}">View saved slot</button>`;
    toast("Smart slot created", `${minutes} minutes have been shaped into a realistic task.`);
  }
  function renderGapSlots() {
    $("#gapSlotCount").textContent = `${gapSlots.length} saved`;
    const list = gapSlots.slice().sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    $("#gapSlotList").innerHTML = list.length ? list.map(s => `<article class="gap-slot ${s.completed ? "completed" : ""}"><div class="gap-slot-time"><strong>${escapeHTML(s.start)}–${escapeHTML(s.end)}</strong><span>${escapeHTML(formatDate(s.date, { weekday: "short", day: "numeric", month: "short" }))}</span></div><div class="gap-slot-main"><div class="deadline-title-row"><strong>${escapeHTML(s.subject)}</strong><span class="gap-duration">${s.minutes} min</span></div><h4>${escapeHTML(s.title)}</h4><p>${escapeHTML(s.recommendation)}</p><span class="energy-tag">${escapeHTML(s.energy)} energy</span></div><div class="deadline-actions">${!s.completed ? `<button class="btn btn-secondary btn-sm" data-gap-done="${escapeHTML(s.id)}"><i class="fa-solid fa-check"></i> Done</button>` : `<span class="completed-label"><i class="fa-solid fa-check-circle"></i> Completed</span>`}<button class="icon-button tiny" data-gap-delete="${escapeHTML(s.id)}" aria-label="Delete slot"><i class="fa-solid fa-trash"></i></button></div></article>`).join("") : `<div class="empty-feature"><i class="fa-solid fa-calendar-plus"></i><p>No saved gaps yet. Add a slot from your timetable.</p></div>`;
  }

  function renderAssistant() {
    const messages = assistantHistory.length ? assistantHistory : [{ role: "assistant", text: `Hi ${profile.name.split(/\s+/)[0] || "there"}! Tell me what you are working on. I can help you prioritise an exam, break down an assignment, plan a study gap, or review your current marks.` }];
    $("#assistantMessages").innerHTML = messages.map(m => `<div class="chat-message ${m.role === "user" ? "user-message" : "assistant-message"}">${m.role === "user" ? "" : `<span class="chat-avatar"><i class="fa-solid fa-sparkles"></i></span>`}<div>${m.role === "assistant" ? "<strong>Learnix Study Assistant</strong>" : "<strong>You</strong>"}<p>${escapeHTML(m.text).replace(/\n/g, "<br>")}</p></div></div>`).join("");
    const openDue = deadlines.filter(d => !d.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const avg = marksEntries.length ? marksEntries.reduce((sum, m) => sum + m.obtained / m.maximum * 100, 0) / marksEntries.length : null;
    const nextExam = examPlans[0];
    $("#assistantContext").innerHTML = `<div class="context-item"><span class="context-icon icon-amber"><i class="fa-solid fa-bell"></i></span><div><strong>${openDue.length} open deadline${openDue.length === 1 ? "" : "s"}</strong><p>${openDue[0] ? `Next: ${escapeHTML(openDue[0].title)} · ${escapeHTML(deadlineStatus(openDue[0]).text)}` : "No assignments on your deadline board."}</p></div></div><div class="context-item"><span class="context-icon icon-violet"><i class="fa-solid fa-chart-line"></i></span><div><strong>${avg === null ? "No marks recorded" : `Marks average ${avg.toFixed(1)}%`}</strong><p>${marksEntries.length ? `${marksEntries.length} saved assessment result${marksEntries.length === 1 ? "" : "s"}.` : "Record a result to help prioritise your revision."}</p></div></div><div class="context-item"><span class="context-icon icon-blue"><i class="fa-solid fa-calendar-day"></i></span><div><strong>${nextExam ? escapeHTML(nextExam.subject) : "No exam roadmap yet"}</strong><p>${nextExam ? `${dateDiffDays(nextExam.date)} day(s) until ${formatDate(nextExam.date)}.` : "Use Quiz & exam prep to plan around an exam date."}</p></div></div><div class="context-item"><span class="context-icon icon-green"><i class="fa-solid fa-list-check"></i></span><div><strong>${tasks.filter(t => !t.completed).length} open study tasks</strong><p>Focus on one specific next step rather than the entire workload.</p></div></div>`;
    $("#assistantMessages").scrollTop = $("#assistantMessages").scrollHeight;
  }
  function buildAssistantReply(query) {
    const q = query.toLowerCase();
    const openDue = deadlines.filter(d => !d.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextExam = examPlans[0];
    const avgMarks = marksEntries.length ? marksEntries.reduce((sum, m) => sum + m.obtained / m.maximum * 100, 0) / marksEntries.length : null;
    const openTasks = tasks.filter(t => !t.completed);
    if (/deadline|assignment|due date|submission/.test(q)) {
      if (!openDue.length) return "You have no open assignments on your deadline board yet. Add each assignment with its due date and priority; then start with the nearest or highest-priority item. A useful next step is to define the smallest part you can finish in 20 minutes.";
      const item = openDue[0], st = deadlineStatus(item);
      return `Your closest open assignment is “${item.title}” for ${item.subject}, due ${formatDate(item.dueDate)} (${st.text}). I'd suggest a 3-step plan: 1) list the submission requirements, 2) complete the hardest or highest-value part first, and 3) leave a final review buffer. ${item.priority === "High" ? "It is marked high priority, so put it near the top of today's plan." : "Check that its priority still reflects the actual marks and effort involved."}`;
    }
    if (/exam|revise|revision|prepare|test/.test(q)) {
      if (nextExam) return `Your saved exam roadmap is for ${nextExam.subject} on ${formatDate(nextExam.date)}. Set aside ${nextExam.minutes} minutes per day. Start with active recall, attempt a small set of exam-style questions, then spend time reviewing the mistakes. ${dateDiffDays(nextExam.date) <= 2 ? "Because the exam is close, focus on key concepts and rest instead of starting many new chapters." : "Break the syllabus into small blocks and revisit weaker topics more than once."}`;
      return "To prepare well, first list the syllabus topics, then mark each as confident / uncertain / not started. Give uncertain topics the most practice time. Use a short quiz to test recall, review every mistake, and finish with one timed practice set. You can save an exam date in Quiz & exam prep to create a roadmap.";
    }
    if (/mark|score|grade|percentage|result/.test(q)) {
      if (avgMarks !== null) return `Your average across ${marksEntries.length} recorded assessment${marksEntries.length === 1 ? "" : "s"} is ${avgMarks.toFixed(1)}%. Look at subject-level results rather than treating the overall average as the full picture. Record each result in Marks tracker, then use the target score calculator with your actual course weighting.`;
      return "Start by recording assessment name, subject, marks obtained, and maximum marks in Marks tracker. Percentages are normalised so a 32/50 and a 64/100 are comparable. If your course has weighted exams, use the target score calculator rather than a simple average.";
    }
    if (/gap|between classes|free time|minutes free|time slot/.test(q)) {
      const duration = (q.match(/(\d+)\s*-?\s*minute/) || q.match(/(\d+)\s*min/));
      const min = duration ? Number(duration[1]) : 25;
      const idea = buildGapRecommendation(min, "medium", "your priority subject");
      return `For a ${min}-minute gap, I recommend “${idea.title.toLowerCase()}”: ${idea.body} Add the real start and end time in Smart gap planner so the session fits your timetable. Keep the task small enough to finish before your next commitment.`;
    }
    if (/opportunit|internship|hackathon|scholarship|open source/.test(q)) return "Open Opportunity matcher and choose the areas you genuinely want to explore. Add your skills (even beginner skills such as HTML, CSS, Git, or Python) and weekly availability. The matcher ranks relevant directories and programmes; always confirm deadlines and eligibility on official pages before applying.";
    if (/consisten|streak|habit|routine|discipline/.test(q)) return "Your consistency score is deliberately not a streak. It combines follow-through on planned tasks (60%) with active-day coverage across the last 14 days (40%). Missing a day does not reset it. Choose a realistic study commitment, log completed sessions honestly, and review the trend without treating the score as a judgement of your ability.";
    if (/quiz|practice question|test me/.test(q)) return "Start with a five-question quiz in Quiz & exam prep. Answer without notes, submit to see explanations, then write down the one concept you missed most. Revisit that concept later and retry a fresh quiz. The built-in bank is practice material rather than an official paper.";
    if (/plan|focus|what should|overwhelm|start|study/.test(q)) {
      const priority = openTasks[0];
      if (priority) return `Let's make the next step small. Your study plan has ${openTasks.length} open task(s). Start with “${priority.topic}” (${priority.duration || 25} minutes, ${priority.subject}). Put your phone away, work for one focused block, and spend the final two minutes noting what is still unclear. If this task no longer fits your priorities, update the plan instead of forcing it.`;
      return "Try this 30-minute reset: 2 minutes to choose one topic, 20 minutes of focused practice, 5 minutes to check your work, and 3 minutes to note what to review next. A task is useful when it is specific, small enough to start, and clear about what 'done' means.";
    }
    return "I can help you make a practical next step. Tell me the subject and your time available, or ask about your nearest deadline, an exam plan, marks, a short study gap, opportunity options, or consistency. I use your saved dashboard data where relevant. This demo generates guidance locally and is not connected to a live AI model.";
  }
  function sendAssistantMessage(text) {
    const query = String(text || "").trim(); if (!query) return;
    if (!assistantHistory.length) assistantHistory.push({ role: "assistant", text: `Hi ${profile.name.split(/\s+/)[0] || "there"}! Tell me what you are working on. I can help you prioritise an exam, break down an assignment, plan a study gap, or review your current marks.`, createdAt: new Date().toISOString() });
    assistantHistory.push({ role: "user", text: query, createdAt: new Date().toISOString() });
    assistantHistory.push({ role: "assistant", text: buildAssistantReply(query), createdAt: new Date().toISOString() });
    assistantHistory = assistantHistory.slice(-50); persistFeature(KEYS.assistantHistory, assistantHistory); $("#assistantInput").value = ""; renderAssistant();
  }

  function renderConsistency() {
    const cutoff = Date.now() - 13 * DAY_MS;
    const recent = activities.filter(a => new Date(a.createdAt).getTime() >= cutoff);
    const activeDates = new Set(recent.map(a => a.date || localDateISO(new Date(a.createdAt))));
    const activeDays = Math.min(14, activeDates.size);
    const completed = tasks.filter(t => t.completed).length, taskRate = tasks.length ? completed / tasks.length * 100 : 0;
    const coverage = activeDays / 14 * 100;
    const score = Math.round(taskRate * .6 + coverage * .4);
    $(".consistency-gauge").style.background = `conic-gradient(var(--primary) 0deg ${score * 3.6}deg, var(--border) ${score * 3.6}deg 360deg)`;
    const minutes = recent.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
    $("#consistencyScore").textContent = score; $("#consistencyTaskRate").textContent = `${Math.round(taskRate)}%`; $("#consistencyActiveDays").textContent = `${activeDays} / 14`; $("#consistencyMinutes").textContent = minutes;
    $("#consistencyLabel").textContent = score >= 80 ? "Your follow-through is becoming a reliable system." : score >= 50 ? "You are building a workable rhythm." : score > 0 ? "Small, repeatable steps will strengthen your score." : "Your score starts with one completed step.";
    $("#consistencySummary").textContent = `Score ${score}/100 = 60% plan follow-through (${Math.round(taskRate)}%) + 40% activity coverage (${activeDays}/14 days). It uses a rolling 14-day window; there is no streak counter and no daily reset.`;
    $("#activityTimeline").innerHTML = recent.length ? recent.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25).map(a => `<article class="activity-row"><span class="activity-icon ${a.type === "quiz" ? "activity-purple" : a.type === "deadline" ? "activity-amber" : "activity-green"}"><i class="fa-solid ${a.type === "quiz" ? "fa-circle-question" : a.type === "deadline" ? "fa-file-circle-check" : a.type === "gap" ? "fa-clock" : "fa-check"}"></i></span><div><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(formatDate(a.date || localDateISO(new Date(a.createdAt)), { weekday: "short", day: "numeric", month: "short" }))} · ${escapeHTML(a.type.replace(/-/g, " "))}</p></div><span class="activity-minutes">${a.minutes ? `${a.minutes} min` : "Logged"}</span></article>`).join("") : `<div class="empty-feature"><i class="fa-solid fa-seedling"></i><p>No study activity recorded in the last 14 days. Log one real session to start the picture—no need to do it every day.</p></div>`;
  }
  function logStudySession(event) {
    event.preventDefault();
    const title = $("#sessionTitle").value.trim(), type = $("#sessionType").value, minutes = Number($("#sessionMinutes").value);
    if (!title || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) { toast("Check your session", "Add a title and a duration between 1 and 600 minutes."); return; }
    recordActivity(type, title, minutes); $("#studySessionForm").reset(); $("#sessionMinutes").value = 25; renderConsistency();
    toast("Session logged", `${minutes} minutes added to your recent activity.`);
  }
  function exportActivity() {
    const cols = ["date", "type", "title", "minutes"];
    const esc = v => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
    const csv = [cols.map(esc).join(","), ...activities.map(a => cols.map(c => esc(c === "date" ? a.date || localDateISO(new Date(a.createdAt)) : a[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "learnix-study-activity.csv"; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast("Activity exported", "A CSV of your saved study activity was downloaded.");
  }


  /* ---------- student modal / details ---------- */
  function openStudentModal(student = null) {
    $("#studentForm").reset(); $("#studentFormError").classList.add("hidden");
    $("#studentRecordId").value = student ? student.id : "";
    $("#studentModalTitle").textContent = student ? "Edit student" : "Add student";
    $("#studentName").value = student?.name || ""; $("#studentId").value = student?.id || ""; $("#studentId").readOnly = Boolean(student);
    $("#studentAttendance").value = student?.attendance ?? ""; $("#studentMarks").value = student?.marks ?? "";
    $("#studentAssignments").value = student?.assignments ?? "";
    $("#studentWeakSubject").value = student && student.weakSubject !== "Not specified" ? student.weakSubject || "" : "";
    $("#studentModalBackdrop").classList.remove("hidden"); $("#studentName").focus();
  }
  const closeStudentModal = () => $("#studentModalBackdrop").classList.add("hidden");
  function closeAllModals() { closeStudentModal(); $("#detailModalBackdrop").classList.add("hidden"); $("#planModalBackdrop").classList.add("hidden"); closeProfileModal(); closeProfileDropdown(); }
  function saveStudent(event) {
    event.preventDefault();
    const id = $("#studentId").value.trim(), name = $("#studentName").value.trim();
    const attendance = Number($("#studentAttendance").value), marks = Number($("#studentMarks").value), assignments = Number($("#studentAssignments").value);
    const existingId = $("#studentRecordId").value, error = $("#studentFormError");
    const fail = msg => { error.textContent = msg; error.classList.remove("hidden"); };
    if (!name || !id || [attendance, marks, assignments].some(v => !Number.isFinite(v) || v < 0 || v > 100)) return fail("Enter a name, ID, and valid percentages between 0 and 100.");
    if (!existingId && students.some(s => s.id.toLowerCase() === id.toLowerCase())) return fail("That student ID already exists. Choose a unique ID.");
    const prev = existingId ? students.find(s => s.id === existingId) : null;
    let assessments = prev ? prev.assessments.slice() : [marks];
    if (prev && marks !== prev.marks) assessments = [...assessments, marks].slice(-6);
    const record = { id, name, attendance, marks, assignments, weakSubject: $("#studentWeakSubject").value.trim() || "Not specified", assessments };
    if (existingId) students = students.map(s => s.id === existingId ? record : s); else students.push(record);
    writeStore(KEYS.students, students); closeStudentModal(); refreshAll();
    toast(existingId ? "Student updated" : "Student added", `${name}'s record has been saved in this browser.`);
  }
  function openStudentDetails(id) {
    const s = students.find(x => x.id === id); if (!s) return;
    const signals = getSignals(s), sid = escapeHTML(s.id), st = studentStatus(s);
    $("#detailModalTitle").textContent = s.name;
    $("#studentDetailContent").innerHTML = `<div class="detail-summary">${studentAvatar(s)}<div><h3>${escapeHTML(s.name)}</h3><p>${sid} · Focus area: ${escapeHTML(s.weakSubject || "Not specified")}</p><span class="status-pill ${statusClass(st)}">${statusLabel(st)}</span></div></div><div class="detail-metrics"><div class="detail-metric"><span>Attendance</span><strong>${s.attendance}%</strong></div><div class="detail-metric"><span>Average score</span><strong>${s.marks}%</strong></div><div class="detail-metric"><span>Assignments</span><strong>${s.assignments}%</strong></div></div><div class="detail-reasons"><strong>${signals.length ? "Indicators to review" : "No current support flags"}</strong>${signals.length ? `<ul>${signals.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : `<p style="font-size:10px;margin:7px 0 0;color:#8d7956">Continue checking in and reviewing the student's context.</p>`}</div><p style="font-size:10px;color:var(--muted);line-height:1.7">Suggested conversation: ask what is making learning difficult, agree on one manageable next step, and check in again. These rules are indicators only—not a diagnosis or validated prediction.</p><div class="detail-actions"><button class="btn btn-secondary" data-action="edit" data-id="${sid}"><i class="fa-solid fa-pen"></i> Edit record</button><button class="btn btn-primary" data-action="plan" data-id="${sid}"><i class="fa-solid fa-calendar-plus"></i> Build study plan</button></div>`;
    $("#detailModalBackdrop").classList.remove("hidden");
  }
  function handleAction(event) {
    const btn = event.target.closest("[data-action]"); if (!btn) return;
    const id = btn.dataset.id, action = btn.dataset.action, student = students.find(s => s.id === id);
    if (action === "details") openStudentDetails(id);
    if (action === "edit" && student) { $("#detailModalBackdrop").classList.add("hidden"); openStudentModal(student); }
    if (action === "plan" && student) { $("#detailModalBackdrop").classList.add("hidden"); openPlanModal(id); }
    if (action === "delete" && student && window.confirm(`Delete the demo record for ${student.name}? This cannot be undone.`)) {
      students = students.filter(s => s.id !== id); snapshots = snapshots.filter(s => s.studentId !== id);
      writeStore(KEYS.students, students); writeStore(KEYS.snapshots, snapshots); refreshAll(); toast("Student removed", "The demo record was deleted.");
    }
  }

  /* ---------- Learnix profile menu and local profile editor ---------- */
  function renderProfileBindings() {
    const name = profile.name.trim() || "Prince Sharma";
    const role = profile.role.trim() || "Student";
    const short = initials(name);
    [["#profileName", name], ["#profileRole", role], ["#dropdownProfileName", name], ["#dropdownProfileRole", role], ["#profilePreviewName", name], ["#profilePreviewRole", role]].forEach(([selector, value]) => {
      const node = $(selector); if (node) node.textContent = value;
    });
    ["#sidebarProfileAvatar", "#topProfileButton", "#dropdownProfileAvatar", "#profileAvatarPreview"].forEach(selector => {
      const node = $(selector); if (node) node.textContent = short;
    });
  }
  function renderProfilePreview() {
    const name = $("#profileDisplayName").value.trim() || "Your name";
    const role = $("#profileRoleInput").value.trim() || "Your role or course";
    $("#profilePreviewName").textContent = name;
    $("#profilePreviewRole").textContent = role;
    $("#profileAvatarPreview").textContent = initials(name);
  }
  function toggleProfileDropdown(anchor) {
    const menu = $("#profileDropdown");
    if (!menu.classList.contains("hidden") && menu.dataset.openBy === anchor.id) { closeProfileDropdown(); return; }
    closeProfileDropdown();
    menu.classList.remove("hidden");
    menu.dataset.openBy = anchor.id;
    ["#profileMenuButton", "#profileIdentityButton", "#topProfileButton"].forEach(s => { const el = $(s); if (el) el.setAttribute("aria-expanded", el === anchor ? "true" : "false"); });
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(294, window.innerWidth - 24);
    menu.style.width = `${width}px`;
    let left = rect.left < 280 ? rect.right + 8 : rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    menu.style.left = `${left}px`;
    const estimatedHeight = menu.offsetHeight || 250;
    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - 10) top = Math.max(10, rect.top - estimatedHeight - 8);
    menu.style.top = `${top}px`;
  }
  function closeProfileDropdown() {
    const menu = $("#profileDropdown");
    if (!menu) return;
    menu.classList.add("hidden");
    delete menu.dataset.openBy;
    ["#profileMenuButton", "#profileIdentityButton", "#topProfileButton"].forEach(s => { const el = $(s); if (el) el.setAttribute("aria-expanded", "false"); });
  }
  function openProfileModal() {
    closeProfileDropdown();
    $("#profileDisplayName").value = profile.name;
    $("#profileRoleInput").value = profile.role;
    $("#profileFormError").classList.add("hidden");
    renderProfilePreview();
    $("#profileModalBackdrop").classList.remove("hidden");
    window.setTimeout(() => $("#profileDisplayName").focus(), 0);
  }
  function closeProfileModal() {
    const modal = $("#profileModalBackdrop");
    if (modal) modal.classList.add("hidden");
  }
  function saveProfile(event) {
    event.preventDefault();
    const name = $("#profileDisplayName").value.trim();
    const role = $("#profileRoleInput").value.trim();
    const error = $("#profileFormError");
    if (!name || !role) { error.textContent = "Please enter both a display name and a role."; error.classList.remove("hidden"); return; }
    profile = { name: name.slice(0, 70), role: role.slice(0, 90) };
    writeStore(KEYS.profile, profile);
    renderProfileBindings();
    closeProfileModal();
    renderGreeting();
    toast("Profile updated", "Your Learnix profile has been saved in this browser.");
  }

  /* ---------- global refresh / theme / reset ---------- */
  function refreshAll() {
    $("#navStudentCount").textContent = students.length;
    populateStudentSelects();
    renderCurrentPage();
  }
  function applyTheme(theme, persist = true) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-mode", dark);
    $("#settingsThemeToggle").checked = dark;
    const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#0a0e22" : "#f3f5fb");
    if (!persist) return;
    writeStore(KEYS.theme, dark ? "dark" : "light");
    if (activePage === "overview") renderCharts();
    if (activePage === "progress") renderProgress();
  }
  function resetDemo() {
    if (!window.confirm("Reset students, study tasks, and progress snapshots to the original demo data?")) return;
    students = clone(seedStudents); tasks = clone(seedTasks); snapshots = buildSeedSnapshots(students);
    marksEntries = []; deadlines = []; gapSlots = []; activities = []; quizAttempts = []; examPlans = []; assistantHistory = []; activeQuiz = null;
    opportunityPrefs = { interests: ["hackathons"], skills: "", level: "beginner", hours: 5 };
    [[KEYS.students, students], [KEYS.tasks, tasks], [KEYS.snapshots, snapshots], [KEYS.marks, marksEntries], [KEYS.deadlines, deadlines], [KEYS.gaps, gapSlots], [KEYS.activities, activities], [KEYS.quizAttempts, quizAttempts], [KEYS.examPlans, examPlans], [KEYS.assistantHistory, assistantHistory], [KEYS.opportunityPrefs, opportunityPrefs], [KEYS.reminderSeen, {}]].forEach(([key, value]) => writeStore(key, value));
    setSearch(""); $("#studentFilter").value = "all"; $("#studentSort").value = "name";
    refreshAll(); goTo("overview"); toast("Demo data reset", "The original sample workspace and new feature data have been cleared.");
  }

  /* ---------- events ---------- */
  function initEvents() {
    $$("[data-nav]").forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); goTo(btn.dataset.nav); }));
    $("#menuToggle").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#mobileScrim").classList.remove("hidden"); });
    $("#mobileScrim").addEventListener("click", closeSidebar);
    $("#dismissBanner").addEventListener("click", () => { $(".demo-banner").classList.add("hidden"); writeStore(KEYS.banner, true); });
    if (readStore(KEYS.banner, false)) $(".demo-banner").classList.add("hidden");

    $("#addStudentButton").addEventListener("click", () => openStudentModal());
    $("#overviewAddStudent").addEventListener("click", () => { goTo("students"); openStudentModal(); });
    $("#closeStudentModal").addEventListener("click", closeStudentModal); $("#cancelStudentModal").addEventListener("click", closeStudentModal);
    $("#studentModalBackdrop").addEventListener("click", e => { if (e.target.id === "studentModalBackdrop") closeStudentModal(); });
    $("#closeDetailModal").addEventListener("click", () => $("#detailModalBackdrop").classList.add("hidden"));
    $("#detailModalBackdrop").addEventListener("click", e => { if (e.target.id === "detailModalBackdrop") $("#detailModalBackdrop").classList.add("hidden"); });
    $("#studentForm").addEventListener("submit", saveStudent);

    $("#closePlanModal").addEventListener("click", () => $("#planModalBackdrop").classList.add("hidden"));
    $("#cancelPlanModal").addEventListener("click", () => $("#planModalBackdrop").classList.add("hidden"));
    $("#planModalBackdrop").addEventListener("click", e => { if (e.target.id === "planModalBackdrop") $("#planModalBackdrop").classList.add("hidden"); });
    $("#planStudent").addEventListener("change", syncPlanSubject);
    $("#planForm").addEventListener("submit", submitPlanForm);

    [$("#studentRows"), $("#overviewSupportRows"), $("#warningCards"), $("#studentDetailContent")].forEach(el => el.addEventListener("click", handleAction));
    $("#studentSearch").addEventListener("input", e => { setSearch(e.target.value); renderStudents(); });
    $("#studentFilter").addEventListener("change", renderStudents); $("#studentSort").addEventListener("change", renderStudents);
    $("#warningFilter").addEventListener("change", renderWarnings);
    $("#globalSearch").addEventListener("input", e => { setSearch(e.target.value); if (e.target.value.trim() && activePage !== "students") goTo("students"); else if (activePage === "students") renderStudents(); });
    $("#globalSearch").addEventListener("keydown", e => { if (e.key === "Escape") { setSearch(""); if (activePage === "students") renderStudents(); e.target.blur(); } });
    $("#searchHint").textContent = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘ K" : "Ctrl K";

    $("#notificationButton").addEventListener("click", () => {
      const supportCount = students.filter(s => studentStatus(s) === "support").length;
      const urgent = deadlines.filter(d => !d.completed && dateDiffDays(d.dueDate) <= 2).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const lines = [];
      if (urgent.length) lines.push(`${urgent.length} assignment${urgent.length === 1 ? " is" : "s are"} due within 48 hours or overdue: ${urgent.slice(0, 2).map(d => `${d.title} (${deadlineStatus(d).text})`).join("; ")}.`);
      if (supportCount) lines.push(`${supportCount} student record${supportCount === 1 ? " shows" : "s show"} academic support indicators.`);
      if (!lines.length) lines.push("You are all caught up. No urgent deadlines or student support signals are currently recorded.");
      toast("Learnix notifications", lines.join(" "));
    });
    [$("#profileMenuButton"), $("#profileIdentityButton"), $("#topProfileButton")].forEach(trigger => trigger.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation(); toggleProfileDropdown(trigger);
    }));
    $("#profileDropdown").addEventListener("click", e => {
      const action = e.target.closest("[data-profile-action]")?.dataset.profileAction;
      if (!action) return;
      closeProfileDropdown();
      if (action === "edit") openProfileModal();
      else if (action === "settings") goTo("settings");
      else if (action === "consistency") goTo("consistency");
    });
    $("#profileForm").addEventListener("submit", saveProfile);
    $("#profileDisplayName").addEventListener("input", renderProfilePreview);
    $("#profileRoleInput").addEventListener("input", renderProfilePreview);
    $("#closeProfileModal").addEventListener("click", closeProfileModal);
    $("#cancelProfileModal").addEventListener("click", closeProfileModal);
    $("#profileModalBackdrop").addEventListener("click", e => { if (e.target.id === "profileModalBackdrop") closeProfileModal(); });
    document.addEventListener("click", e => {
      if (!e.target.closest("#profileDropdown") && !e.target.closest("#profileMenuButton") && !e.target.closest("#profileIdentityButton") && !e.target.closest("#topProfileButton")) closeProfileDropdown();
    });
    window.addEventListener("resize", closeProfileDropdown);
    $("#performanceChartInfo").addEventListener("click", () => toast("About this chart", "Averages are calculated from each student's recorded assessment scores. The dashed line is a 75% sample target."));

    ["studyHours", "assignmentGoal", "practiceSessions", "revisionSessions"].forEach(id => $(`#${id}`).addEventListener("input", updateSimulator));
    $("#simStudent").addEventListener("change", updateSimulator);
    $("#resetSimulator").addEventListener("click", () => { $("#studyHours").value = 45; $("#assignmentGoal").value = 85; $("#practiceSessions").value = 4; $("#revisionSessions").value = 3; updateSimulator(); toast("Scenario reset", "Default goal settings restored."); });
    $("#useScenarioPlan").addEventListener("click", () => { const v = simValues(); createPlan({ student: selectedSimStudent(), subject: "", minutes: v.minutes, practices: v.practices, revisions: v.revisions }); });
    $("#openPlanForm").addEventListener("click", () => openPlanModal()); $("#emptyCreatePlan").addEventListener("click", () => openPlanModal());

    $("#taskList").addEventListener("change", e => { const id = e.target.dataset.taskToggle; if (!id) return; const task = tasks.find(t => t.id === id); tasks = tasks.map(t => t.id === id ? { ...t, completed: e.target.checked } : t); writeStore(KEYS.tasks, tasks); if (e.target.checked && task) recordActivity("study-plan", `Completed: ${task.topic}`, Number(task.duration) || 0); renderTasks(); });
    $("#taskList").addEventListener("click", e => { const b = e.target.closest("[data-task-delete]"); if (!b) return; tasks = tasks.filter(t => t.id !== b.dataset.taskDelete); writeStore(KEYS.tasks, tasks); renderTasks(); toast("Task deleted", "The task was removed from your plan."); });
    $("#rescheduleTasks").addEventListener("click", rescheduleTasks);

    $("#progressStudent").addEventListener("change", renderProgress); $("#recordSnapshot").addEventListener("click", recordSnapshot);
    $("#printReport").addEventListener("click", () => window.print()); $("#exportCsv").addEventListener("click", exportCSV);
    $("#refreshReport").addEventListener("click", () => { renderReport(); toast("Report refreshed", "The summary reflects current demo records."); });
    $("#settingsThemeToggle").addEventListener("change", e => applyTheme(e.target.checked ? "dark" : "light"));
    $("#resetDemoData").addEventListener("click", resetDemo);

    // Quiz and exam preparation
    $("#quizSetupForm").addEventListener("submit", startQuiz);
    $("#quizAnswerForm").addEventListener("submit", submitQuiz);
    $("#restartQuizButton").addEventListener("click", () => { activeQuiz = null; $("#quizResults").classList.add("hidden"); renderQuizPage(); });
    $("#examPlanForm").addEventListener("submit", submitExamPlan);

    // Assignment deadlines and reminders
    $("#deadlineForm").addEventListener("submit", addDeadline);
    $("#deadlineFilter").addEventListener("change", renderDeadlines);
    $("#enableNotificationsButton").addEventListener("click", enableBrowserNotifications);
    $("#checkDeadlinesNow").addEventListener("click", () => { checkDeadlineReminders(true); if (!deadlines.some(d => !d.completed && dateDiffDays(d.dueDate) <= 2)) toast("No urgent deadlines", "No open assignment is due within the next two days."); });
    $("#deadlineList").addEventListener("click", e => {
      const done = e.target.closest("[data-deadline-done]"), del = e.target.closest("[data-deadline-delete]");
      if (done) {
        const item = deadlines.find(d => d.id === done.dataset.deadlineDone);
        deadlines = deadlines.map(d => d.id === done.dataset.deadlineDone ? { ...d, completed: true, completedAt: new Date().toISOString() } : d);
        persistFeature(KEYS.deadlines, deadlines); if (item) recordActivity("deadline", `Submitted / completed: ${item.title}`, 10); renderDeadlines(); toast("Assignment completed", "Nice work. One deadline is off your list.");
      } else if (del && window.confirm("Delete this saved assignment deadline?")) { deadlines = deadlines.filter(d => d.id !== del.dataset.deadlineDelete); persistFeature(KEYS.deadlines, deadlines); renderDeadlines(); toast("Deadline removed", "The assignment was removed from your board."); }
    });

    // Study assistant
    $("#assistantForm").addEventListener("submit", e => { e.preventDefault(); sendAssistantMessage($("#assistantInput").value); });
    $(".assistant-prompts").addEventListener("click", e => { const b = e.target.closest("[data-prompt]"); if (b) sendAssistantMessage(b.dataset.prompt); });

    // Marks tracker and grade target calculator
    $("#marksForm").addEventListener("submit", addMarks);
    $("#targetScoreForm").addEventListener("submit", calculateTargetScore);
    $("#marksSubjectFilter").addEventListener("change", renderMarks);
    $("#marksHistory").addEventListener("click", e => { const b = e.target.closest("[data-marks-delete]"); if (!b) return; marksEntries = marksEntries.filter(m => m.id !== b.dataset.marksDelete); persistFeature(KEYS.marks, marksEntries); renderMarks(); toast("Assessment removed", "The saved marks entry was deleted."); });

    // Smart gap-time planner
    $("#gapForm").addEventListener("submit", submitGap);
    $("#gapSlotList").addEventListener("click", e => {
      const done = e.target.closest("[data-gap-done]"), del = e.target.closest("[data-gap-delete]");
      if (done) {
        const slot = gapSlots.find(g => g.id === done.dataset.gapDone);
        gapSlots = gapSlots.map(g => g.id === done.dataset.gapDone ? { ...g, completed: true, completedAt: new Date().toISOString() } : g);
        persistFeature(KEYS.gaps, gapSlots); if (slot) recordActivity("gap", `Completed gap session: ${slot.subject}`, slot.minutes); renderGapSlots(); toast("Gap session completed", "Your finished slot has been recorded for your consistency score.");
      } else if (del && window.confirm("Delete this saved gap-time slot?")) { gapSlots = gapSlots.filter(g => g.id !== del.dataset.gapDelete); persistFeature(KEYS.gaps, gapSlots); renderGapSlots(); }
    });
    $("#gapRecommendation").addEventListener("click", e => { if (e.target.closest("[data-jump-gaps]")) $("#gapSlotList").scrollIntoView({ behavior: "smooth", block: "start" }); });

    // Opportunity matching
    $("#opportunityForm").addEventListener("submit", e => { e.preventDefault(); matchOpportunities(true); });
    $("#opportunitySort").addEventListener("change", () => matchOpportunities(false));

    // Consistency score: activities, not consecutive-day streaks
    $("#studySessionForm").addEventListener("submit", logStudySession);
    $("#exportActivityButton").addEventListener("click", exportActivity);

    window.addEventListener("hashchange", () => { const p = location.hash.slice(1); if (PAGES[p] && p !== activePage) goTo(p); });
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#globalSearch").focus(); }
      if (e.key === "Escape") { closeAllModals(); closeSidebar(); }
    });
  }

  /* ---------- dialog accessibility: focus in, trap Tab, restore focus ---------- */
  function initDialogFocus() {
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const backdrops = $$(".modal-backdrop"), opener = new WeakMap();
    const visible = el => el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    backdrops.forEach(bd => {
      let wasOpen = false;
      new MutationObserver(() => {
        const open = !bd.classList.contains("hidden");
        if (open === wasOpen) return;
        wasOpen = open;
        if (open) {
          opener.set(bd, document.activeElement);
          requestAnimationFrame(() => { const first = $$(FOCUSABLE, bd).find(visible); if (first) first.focus({ preventScroll: true }); });
        } else {
          const back = opener.get(bd);
          if (back && document.contains(back) && !$$(".modal-backdrop").some(b => !b.classList.contains("hidden"))) back.focus({ preventScroll: true });
        }
      }).observe(bd, { attributes: true, attributeFilter: ["class"] });
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const bd = backdrops.find(b => !b.classList.contains("hidden")); if (!bd) return;
      const items = $$(FOCUSABLE, bd).filter(visible); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (!bd.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function init() {
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(readStore(KEYS.theme, systemDark ? "dark" : "light") === "dark" ? "dark" : "light", false);
    renderProfileBindings();
    initEvents();
    initDialogFocus();
    $("#navStudentCount").textContent = students.length;
    populateStudentSelects();
    setDateDefaults();
    const start = location.hash.slice(1);
    goTo(PAGES[start] ? start : "overview", { scroll: false });
    checkDeadlineReminders(false);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
