const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Colours given to subjects (the same subject always gets the same colour)
const colours = ["#b91c1c", "#0369a1", "#15803d", "#a16207", "#7e22ce", "#be185d", "#0f766e", "#c2410c"];

// Page elements
const form = document.getElementById("session-form");
const subjectInput = document.getElementById("subject-input");
const daySelect = document.getElementById("day-select");
const startInput = document.getElementById("start-input");
const endInput = document.getElementById("end-input");
const formMessage = document.getElementById("form-message");
const weekGrid = document.getElementById("week-grid");
const totalTimeEl = document.getElementById("total-time");
const sessionCountEl = document.getElementById("session-count");
const busiestDayEl = document.getElementById("busiest-day");
const printBtn = document.getElementById("print-btn");
const clearBtn = document.getElementById("clear-btn");

// Monday is 0 and Sunday is 6 (JavaScript counts Sunday as 0, so shift it)
const todayIndex = (new Date().getDay() + 6) % 7;

let sessions = [];

// Load saved sessions, if any
try {
  const saved = JSON.parse(localStorage.getItem("study-sessions"));
  if (Array.isArray(saved)) {
    sessions = saved.filter(function (s) {
      return s &&
        typeof s.subject === "string" &&
        typeof s.day === "number" &&
        typeof s.start === "number" &&
        typeof s.end === "number";
    });
  }
} catch (error) {
  sessions = [];
}

function saveSessions() {
  try {
    localStorage.setItem("study-sessions", JSON.stringify(sessions));
  } catch (error) {
    // Saving is optional, so ignore errors
  }
}

// "14:30" becomes 870 (minutes since midnight)
function parseTime(text) {
  const parts = text.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// 870 becomes "2:30 pm"
function formatTime(minutes) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? "pm" : "am";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return hours12 + ":" + (mins < 10 ? "0" : "") + mins + " " + suffix;
}

// 90 becomes "1 h 30 min"
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return mins + " min";
  if (mins === 0) return hours + " h";
  return hours + " h " + mins + " min";
}

function colourFor(subject) {
  let total = 0;
  const text = subject.toLowerCase();
  for (let i = 0; i < text.length; i++) {
    total += text.charCodeAt(i);
  }
  return colours[total % colours.length];
}

function render() {
  weekGrid.innerHTML = "";

  let totalMinutes = 0;
  let busiestIndex = -1;
  let busiestMinutes = 0;

  dayNames.forEach(function (dayName, dayIndex) {
    const card = document.createElement("div");
    card.className = "day-card" + (dayIndex === todayIndex ? " today" : "");

    const daySessions = sessions
      .filter(function (s) {
        return s.day === dayIndex;
      })
      .sort(function (a, b) {
        return a.start - b.start;
      });

    let dayMinutes = 0;
    daySessions.forEach(function (s) {
      dayMinutes += s.end - s.start;
    });
    totalMinutes += dayMinutes;

    if (dayMinutes > busiestMinutes) {
      busiestMinutes = dayMinutes;
      busiestIndex = dayIndex;
    }

    // Day heading
    const header = document.createElement("div");
    header.className = "day-header";

    const nameWrap = document.createElement("span");
    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = dayName;
    nameWrap.appendChild(name);

    if (dayIndex === todayIndex) {
      const badge = document.createElement("span");
      badge.className = "today-badge";
      badge.textContent = "Today";
      nameWrap.appendChild(badge);
    }

    const dayTotal = document.createElement("span");
    dayTotal.className = "day-total";
    dayTotal.textContent = dayMinutes > 0 ? formatDuration(dayMinutes) : "";

    header.appendChild(nameWrap);
    header.appendChild(dayTotal);
    card.appendChild(header);

    // Sessions for the day
    if (daySessions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-day";
      empty.textContent = "No sessions";
      card.appendChild(empty);
    }

    daySessions.forEach(function (s) {
      const colour = colourFor(s.subject);

      const item = document.createElement("div");
      item.className = "session";
      item.style.borderLeftColor = colour;
      item.style.background = colour + "1a";

      const info = document.createElement("div");

      const subject = document.createElement("span");
      subject.className = "session-subject";
      subject.textContent = s.subject;

      const time = document.createElement("span");
      time.className = "session-time";
      time.textContent = formatTime(s.start) + " to " + formatTime(s.end);

      info.appendChild(subject);
      info.appendChild(time);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn no-print";
      deleteBtn.textContent = "\u00D7";
      deleteBtn.setAttribute("aria-label", "Delete " + s.subject + " session");
      deleteBtn.addEventListener("click", function () {
        sessions = sessions.filter(function (other) {
          return other.id !== s.id;
        });
        saveSessions();
        render();
      });

      item.appendChild(info);
      item.appendChild(deleteBtn);
      card.appendChild(item);
    });

    weekGrid.appendChild(card);
  });

  // Summary boxes
  totalTimeEl.textContent = totalMinutes > 0 ? formatDuration(totalMinutes) : "0 min";
  sessionCountEl.textContent = sessions.length;
  busiestDayEl.textContent = busiestIndex >= 0 ? dayNames[busiestIndex] : "-";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  formMessage.textContent = "";

  const subject = subjectInput.value.trim();
  const day = parseInt(daySelect.value, 10);

  if (subject === "") {
    formMessage.textContent = "Please enter a subject or course.";
    return;
  }
  if (startInput.value === "" || endInput.value === "") {
    formMessage.textContent = "Please choose a start time and an end time.";
    return;
  }

  const start = parseTime(startInput.value);
  const end = parseTime(endInput.value);

  if (end <= start) {
    formMessage.textContent = "The end time must be after the start time.";
    return;
  }

  // Do not allow two sessions at the same time on the same day
  const clash = sessions.find(function (s) {
    return s.day === day && start < s.end && end > s.start;
  });
  if (clash) {
    formMessage.textContent =
      "This overlaps with " + clash.subject + " (" + formatTime(clash.start) +
      " to " + formatTime(clash.end) + ") on " + dayNames[day] + ".";
    return;
  }

  sessions.push({
    id: Date.now(),
    subject: subject,
    day: day,
    start: start,
    end: end
  });
  saveSessions();
  render();

  // Keep the day and times so several sessions are quick to add
  subjectInput.value = "";
  startInput.value = "";
  endInput.value = "";
  subjectInput.focus();
});

printBtn.addEventListener("click", function () {
  window.print();
});

clearBtn.addEventListener("click", function () {
  if (sessions.length === 0) return;
  if (confirm("Delete all study sessions?")) {
    sessions = [];
    saveSessions();
    render();
  }
});

// Start with today's day selected
daySelect.value = String(todayIndex);

render();