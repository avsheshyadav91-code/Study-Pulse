/**
 * ==========================================================================
 * STUDYPULSE - STUDENT STUDY PLANNER
 * Vanilla JavaScript (ES6+) Application Logic
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. GLOBAL STATE & CONSTANTS
// --------------------------------------------------------------------------
const STORAGE_KEYS = {
  SUBJECTS: 'studypulse_subjects',
  TASKS: 'studypulse_tasks',
  SCHEDULE: 'studypulse_schedule',
  NOTES: 'studypulse_notes',
  POMODORO: 'studypulse_pomodoro',
  THEME: 'studypulse_theme'
};

// Application State
const appState = {
  subjects: [],
  tasks: [],
  schedule: [],
  notes: [],
  pomodoroStats: {
    completedToday: 0,
    totalMinutes: 0,
    lastDate: new Date().toISOString().split('T')[0]
  },
  currentView: 'dashboard',
  theme: 'light',
  
  // Calendar specific state
  calendarDate: new Date(),
  selectedDateStr: formatDateToYYYYMMDD(new Date()),

  // Pomodoro timer state
  timer: {
    mode: 'pomodoro', // 'pomodoro' | 'shortBreak' | 'longBreak'
    durations: {
      pomodoro: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    },
    timeLeft: 25 * 60,
    isRunning: false,
    intervalId: null,
    selectedSubjectId: ''
  },

  // Modal confirmation callback
  confirmCallback: null
};

// Motivational Quotes List
const MOTIVATIONAL_QUOTES = [
  "\"Small daily improvements over time lead to stunning results.\"",
  "\"Focus on progress, not perfection. Every study session counts.\"",
  "\"The expert in anything was once a beginner.\"",
  "\"Success is the sum of small efforts, repeated day in and day out.\"",
  "\"Your future is created by what you do today, not tomorrow.\"",
  "\"Discipline is choosing between what you want now and what you want most.\""
];

// --------------------------------------------------------------------------
// 2. INITIALIZATION & LIFECYCLE
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupNavigation();
  setupEventListeners();
  setupModalHandlers();
  setupPomodoroTimer();
  
  // Render all active views
  renderSubjects();
  renderTasks();
  renderSchedule();
  renderCalendar();
  renderNotes();
  updateDashboard();
  calculateProgress();
});

// --------------------------------------------------------------------------
// 3. LOCAL STORAGE MANAGEMENT
// --------------------------------------------------------------------------
/**
 * Loads all data from LocalStorage or injects realistic initial sample data.
 */
function loadData() {
  try {
    const rawSubjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const rawSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    const rawNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
    const rawPomo = localStorage.getItem(STORAGE_KEYS.POMODORO);

    if (rawSubjects) {
      appState.subjects = JSON.parse(rawSubjects);
    } else {
      appState.subjects = getSampleSubjects();
      saveData();
    }

    if (rawTasks) {
      appState.tasks = JSON.parse(rawTasks);
    } else {
      appState.tasks = getSampleTasks();
      saveData();
    }

    if (rawSchedule) {
      appState.schedule = JSON.parse(rawSchedule);
    } else {
      appState.schedule = getSampleSchedule();
      saveData();
    }

    if (rawNotes) {
      appState.notes = JSON.parse(rawNotes);
    } else {
      appState.notes = getSampleNotes();
      saveData();
    }

    if (rawPomo) {
      const parsed = JSON.parse(rawPomo);
      const todayStr = formatDateToYYYYMMDD(new Date());
      // Reset daily pomodoro count if it's a new day
      if (parsed.lastDate !== todayStr) {
        appState.pomodoroStats = {
          completedToday: 0,
          totalMinutes: parsed.totalMinutes || 0,
          lastDate: todayStr
        };
      } else {
        appState.pomodoroStats = parsed;
      }
    } else {
      appState.pomodoroStats = {
        completedToday: 3,
        totalMinutes: 75,
        lastDate: formatDateToYYYYMMDD(new Date())
      };
      saveData();
    }
  } catch (error) {
    console.error('Error loading data from LocalStorage:', error);
    showToast('Failed to load saved data. Using defaults.', 'error');
  }
}

/**
 * Persists the entire application state into LocalStorage.
 */
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(appState.subjects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(appState.tasks));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(appState.schedule));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(appState.notes));
    localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify(appState.pomodoroStats));
    updateBadges();
  } catch (error) {
    console.error('Error saving data to LocalStorage:', error);
    showToast('Failed to save data. LocalStorage might be full.', 'error');
  }
}

// --------------------------------------------------------------------------
// 4. THEME (LIGHT / DARK) MANAGEMENT
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  appState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);

  // Update theme toggles in UI
  const themeCheckboxes = [
    document.getElementById('theme-checkbox')
  ];
  themeCheckboxes.forEach(cb => {
    if (cb) cb.checked = (theme === 'dark');
  });

  const desktopThemeIcon = document.getElementById('theme-icon');
  const desktopThemeText = document.getElementById('theme-text');
  const mobileThemeBtn = document.getElementById('btn-mobile-theme');

  if (theme === 'dark') {
    if (desktopThemeIcon) desktopThemeIcon.className = 'fas fa-sun';
    if (desktopThemeText) desktopThemeText.textContent = 'Light Mode';
    if (mobileThemeBtn) mobileThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    if (desktopThemeIcon) desktopThemeIcon.className = 'fas fa-moon';
    if (desktopThemeText) desktopThemeText.textContent = 'Dark Mode';
    if (mobileThemeBtn) mobileThemeBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

function toggleTheme() {
  const newTheme = appState.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} theme`, 'info');
}

// --------------------------------------------------------------------------
// 5. NAVIGATION & VIEW SWITCHING
// --------------------------------------------------------------------------
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-view]');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const viewName = link.getAttribute('data-view');
      switchView(viewName);

      // Close mobile drawer if open
      if (window.innerWidth <= 767) {
        closeMobileSidebar();
      }
    });
  });

  // Target jump buttons (e.g. "View All" on dashboard cards)
  document.querySelectorAll('[data-view-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view-target');
      switchView(target);
    });
  });

  // Mobile sidebar controls
  const btnToggle = document.getElementById('btn-sidebar-toggle');
  const btnClose = document.getElementById('btn-sidebar-close');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', closeMobileSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function switchView(viewName) {
  appState.currentView = viewName;

  // Update Nav links active states
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update Sections active state
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update Desktop Header title
  const titleMap = {
    dashboard: 'Dashboard',
    subjects: 'Course Subjects',
    tasks: 'Study Tasks',
    calendar: 'Interactive Calendar',
    schedule: 'Study Timetable',
    pomodoro: 'Pomodoro Focus Timer',
    analytics: 'Study Analytics',
    notes: 'Study Notes'
  };
  const titleElem = document.getElementById('current-view-title');
  if (titleElem) {
    titleElem.textContent = titleMap[viewName] || 'Dashboard';
  }

  // Refresh relevant view data on switch
  if (viewName === 'dashboard') updateDashboard();
  if (viewName === 'calendar') renderCalendar();
  if (viewName === 'analytics') calculateProgress();
  if (viewName === 'tasks') renderTasks();
  if (viewName === 'subjects') renderSubjects();
  if (viewName === 'schedule') renderSchedule();
  if (viewName === 'notes') renderNotes();
}

// --------------------------------------------------------------------------
// 6. DASHBOARD LOGIC & RENDERING
// --------------------------------------------------------------------------
function updateDashboard() {
  const now = new Date();
  
  // 1. Time-based Greeting
  const hours = now.getHours();
  let greeting = 'Good Evening, Student!';
  if (hours < 12) greeting = 'Good Morning, Student!';
  else if (hours < 18) greeting = 'Good Afternoon, Student!';

  const greetingElem = document.getElementById('dashboard-greeting');
  if (greetingElem) greetingElem.textContent = greeting;

  // 2. Current Date Formatted
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString(undefined, options);
  
  const headerDateElem = document.getElementById('header-date');
  const dashDateElem = document.getElementById('dashboard-date');
  if (headerDateElem) headerDateElem.textContent = formattedDate;
  if (dashDateElem) dashDateElem.innerHTML = `<i class="far fa-calendar-check"></i> ${formattedDate}`;

  // 3. Random Motivational Quote
  const quoteElem = document.getElementById('dashboard-quote');
  if (quoteElem && !quoteElem.dataset.setToday) {
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    quoteElem.textContent = randomQuote;
    quoteElem.dataset.setToday = "true";
  }

  // 4. Statistics Cards
  const totalSubjects = appState.subjects.length;
  const pendingTasks = appState.tasks.filter(t => t.status === 'Pending').length;
  const completedTasks = appState.tasks.filter(t => t.status === 'Completed').length;
  const totalTasks = appState.tasks.length;
  
  // Calculate total study hours (from subjects weekly hours target + completed pomodoro minutes)
  const totalStudyHours = (appState.pomodoroStats.totalMinutes / 60).toFixed(1);

  document.getElementById('stat-total-subjects').textContent = totalSubjects;
  document.getElementById('stat-pending-tasks').textContent = pendingTasks;
  document.getElementById('stat-completed-tasks').textContent = completedTasks;
  document.getElementById('stat-study-hours').textContent = `${totalStudyHours}h`;

  // Overdue Tasks calculation
  const todayStr = formatDateToYYYYMMDD(now);
  const overdueCount = appState.tasks.filter(t => t.status === 'Pending' && t.dueDate < todayStr).length;
  const overdueSubtext = document.getElementById('stat-overdue-subtext');
  if (overdueSubtext) {
    overdueSubtext.textContent = overdueCount > 0 ? `${overdueCount} overdue` : `All on schedule`;
    overdueSubtext.style.color = overdueCount > 0 ? 'var(--color-danger)' : 'var(--text-secondary)';
  }

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const compRateSubtext = document.getElementById('stat-completion-rate');
  if (compRateSubtext) compRateSubtext.textContent = `${completionRate}% completed`;

  const pomoSubtext = document.getElementById('stat-pomodoro-subtext');
  if (pomoSubtext) pomoSubtext.textContent = `${appState.pomodoroStats.completedToday} pomodoro sessions today`;

  // Tasks due today summary
  const tasksDueToday = appState.tasks.filter(t => t.dueDate === todayStr);
  const summaryElem = document.getElementById('dashboard-tasks-summary');
  if (summaryElem) {
    summaryElem.innerHTML = `<i class="fas fa-tasks"></i> ${tasksDueToday.length} task${tasksDueToday.length === 1 ? '' : 's'} due today`;
  }

  // 5. Today's Progress Bar
  const todayCompleted = tasksDueToday.filter(t => t.status === 'Completed').length;
  const todayTotal = tasksDueToday.length;
  let todayPercent = 0;
  if (todayTotal > 0) {
    todayPercent = Math.round((todayCompleted / todayTotal) * 100);
  } else if (totalTasks > 0) {
    // If no tasks strictly due today, show overall completion
    todayPercent = completionRate;
  }

  const progressBar = document.getElementById('dashboard-progress-bar');
  const progressRatio = document.getElementById('dashboard-progress-ratio');
  const progressPercent = document.getElementById('dashboard-progress-percent');
  const progressMsg = document.getElementById('dashboard-progress-message');

  if (progressBar) progressBar.style.width = `${todayPercent}%`;
  if (progressRatio) {
    progressRatio.textContent = todayTotal > 0 ? `${todayCompleted}/${todayTotal} Today` : `${completedTasks}/${totalTasks} Overall`;
  }
  if (progressPercent) progressPercent.textContent = `${todayPercent}%`;
  if (progressMsg) {
    if (todayPercent === 100) progressMsg.textContent = "All tasks finished! Amazing work!";
    else if (todayPercent >= 50) progressMsg.textContent = "Great momentum! Over halfway done.";
    else if (todayTotal === 0) progressMsg.textContent = "No deadlines today. Great time to get ahead!";
    else progressMsg.textContent = "Start checking off your tasks.";
  }

  // 6. Today's Study Schedule List
  renderDashboardSchedule(todayStr);

  // 7. Upcoming Deadlines List
  renderDashboardDeadlines(todayStr);

  // 8. Subject Mini Chips
  renderDashboardSubjectChips();
}

function renderDashboardSchedule(todayStr) {
  const container = document.getElementById('dashboard-schedule-list');
  if (!container) return;

  const todaySessions = appState.schedule
    .filter(s => s.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (todaySessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 1rem;">
        <i class="far fa-calendar-times empty-state-icon" style="width: 44px; height: 44px; font-size: 1.25rem;"></i>
        <p class="empty-state-title" style="font-size: 0.95rem;">No sessions scheduled for today</p>
        <p class="empty-state-desc" style="font-size: 0.8rem; margin-bottom: 0.75rem;">Block out study time to stay organized.</p>
        <button class="btn btn-sm btn-secondary" onclick="openScheduleModal()">+ Plan a Session</button>
      </div>
    `;
    return;
  }

  container.innerHTML = todaySessions.map(session => {
    const subject = appState.subjects.find(s => s.id === session.subjectId);
    const subName = subject ? escapeHtml(subject.name) : 'General Study';
    const subColor = subject ? subject.color : 'var(--brand-secondary)';

    return `
      <div class="dash-schedule-item" style="border-left-color: ${subColor};">
        <div class="deadline-left">
          <span class="dash-schedule-topic">${escapeHtml(session.topic)}</span>
          <span class="dash-schedule-subject" style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${subColor}; display: inline-block;"></span>
            ${subName}
          </span>
        </div>
        <div class="dash-schedule-time">
          <i class="far fa-clock"></i> ${formatTime12Hour(session.startTime)} - ${formatTime12Hour(session.endTime)}
        </div>
      </div>
    `;
  }).join('');
}

function renderDashboardDeadlines(todayStr) {
  const container = document.getElementById('dashboard-deadlines-list');
  if (!container) return;

  // Filter pending tasks, sort by deadline ascending
  const upcomingTasks = appState.tasks
    .filter(t => t.status === 'Pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5); // top 5

  if (upcomingTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 1rem;">
        <i class="fas fa-clipboard-check empty-state-icon" style="width: 44px; height: 44px; font-size: 1.25rem;"></i>
        <p class="empty-state-title" style="font-size: 0.95rem;">No upcoming pending tasks</p>
        <p class="empty-state-desc" style="font-size: 0.8rem; margin-bottom: 0.75rem;">You are all caught up!</p>
        <button class="btn btn-sm btn-primary" onclick="openTaskModal()">+ Add New Task</button>
      </div>
    `;
    return;
  }

  container.innerHTML = upcomingTasks.map(task => {
    const subject = appState.subjects.find(s => s.id === task.subjectId);
    const subName = subject ? escapeHtml(subject.name) : 'General';
    const subColor = subject ? subject.color : 'var(--brand-primary)';
    
    const daysDiff = calculateDaysRemaining(task.dueDate);
    let daysBadge = '';
    let isUrgent = false;

    if (daysDiff < 0) {
      daysBadge = `<span class="badge-days-left urgent">Overdue (${Math.abs(daysDiff)}d)</span>`;
      isUrgent = true;
    } else if (daysDiff === 0) {
      daysBadge = `<span class="badge-days-left urgent">Due Today</span>`;
      isUrgent = true;
    } else if (daysDiff === 1) {
      daysBadge = `<span class="badge-days-left urgent">Tomorrow</span>`;
    } else {
      daysBadge = `<span class="badge-days-left normal">${daysDiff} days left</span>`;
    }

    return `
      <div class="deadline-item ${isUrgent && daysDiff < 0 ? 'overdue' : ''}" style="border-left-color: ${subColor};">
        <div class="deadline-left">
          <span class="deadline-title">${escapeHtml(task.title)}</span>
          <div class="deadline-meta">
            <span style="color: ${subColor}; font-weight: 600;">${subName}</span>
            <span>•</span>
            <span><i class="far fa-calendar"></i> ${formatDisplayDate(task.dueDate)}</span>
          </div>
        </div>
        <div class="deadline-right">
          <span class="tag-priority ${task.priority}">${task.priority}</span>
          ${daysBadge}
        </div>
      </div>
    `;
  }).join('');
}

function renderDashboardSubjectChips() {
  const container = document.getElementById('dashboard-subject-mini-list');
  if (!container) return;

  if (appState.subjects.length === 0) {
    container.innerHTML = `<p style="grid-column: span 2; font-size: 0.85rem; color: var(--text-muted); text-align: center;">No subjects added yet.</p>`;
    return;
  }

  container.innerHTML = appState.subjects.slice(0, 4).map(sub => {
    const taskCount = appState.tasks.filter(t => t.subjectId === sub.id && t.status === 'Pending').length;
    return `
      <div class="subject-mini-chip" style="cursor: pointer;" onclick="filterTasksBySubject('${sub.id}')">
        <div class="subject-mini-dot" style="background-color: ${sub.color};"></div>
        <div class="subject-mini-info">
          <span class="subject-mini-name">${escapeHtml(sub.name)}</span>
          <span class="subject-mini-hours">${sub.weeklyHours}h/week • ${taskCount} pending</span>
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 7. SUBJECT MANAGEMENT
// --------------------------------------------------------------------------
function renderSubjects() {
  const container = document.getElementById('subjects-container');
  if (!container) return;

  // Populate Subject selects in all modals & filter dropdowns
  populateSubjectDropdowns();

  if (appState.subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <i class="fas fa-book-open"></i>
        </div>
        <h3 class="empty-state-title">No subjects added yet.</h3>
        <p class="empty-state-desc">Add your semester subjects and courses to track assignments, study schedules, and weekly hours.</p>
        <button class="btn btn-primary" onclick="openSubjectModal()">
          <i class="fas fa-plus"></i> Add Your First Subject
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.subjects.map(subject => {
    const subjectTasks = appState.tasks.filter(t => t.subjectId === subject.id);
    const pendingCount = subjectTasks.filter(t => t.status === 'Pending').length;
    const completedCount = subjectTasks.filter(t => t.status === 'Completed').length;

    let priorityBadgeClass = 'High';
    if (subject.priority === 'Medium') priorityBadgeClass = 'Medium';
    if (subject.priority === 'Low') priorityBadgeClass = 'Low';

    return `
      <div class="subject-card" data-id="${subject.id}">
        <div class="subject-card-stripe" style="background-color: ${subject.color};"></div>
        <div class="subject-card-body">
          <div class="subject-card-header">
            <h4 class="subject-title">${escapeHtml(subject.name)}</h4>
            <span class="tag-priority ${priorityBadgeClass}">${subject.priority}</span>
          </div>

          <p class="subject-teacher">
            <i class="fas fa-chalkboard-teacher"></i>
            ${subject.teacher ? escapeHtml(subject.teacher) : 'No instructor assigned'}
          </p>

          <div class="subject-metrics-row">
            <div class="subject-metric">
              <span class="metric-label">Target Study</span>
              <span class="metric-value">${subject.weeklyHours}h / wk</span>
            </div>
            <div class="subject-metric">
              <span class="metric-label">Tasks</span>
              <span class="metric-value">${pendingCount} Pending (${completedCount} Done)</span>
            </div>
          </div>

          <div class="subject-card-actions">
            <button class="btn btn-sm btn-ghost" onclick="filterTasksBySubject('${subject.id}')" title="Filter tasks for this course">
              <i class="fas fa-tasks"></i> View Tasks
            </button>
            <div class="subject-action-btns">
              <button class="btn-icon" onclick="editSubject('${subject.id}')" title="Edit Subject">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="btn-icon" onclick="confirmDeleteSubject('${subject.id}')" title="Delete Subject">
                <i class="fas fa-trash-alt text-rose"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateSubjectDropdowns() {
  const taskSubSelect = document.getElementById('task-subject-id');
  const schedSubSelect = document.getElementById('schedule-subject-id');
  const noteSubSelect = document.getElementById('note-subject-id');
  const filterSubSelect = document.getElementById('task-filter-subject');
  const schedFilterSelect = document.getElementById('schedule-filter-subject');
  const pomoSubSelect = document.getElementById('pomo-subject-select');

  const optionsHtml = appState.subjects.map(s => 
    `<option value="${s.id}">${escapeHtml(s.name)}</option>`
  ).join('');

  if (taskSubSelect) {
    taskSubSelect.innerHTML = `<option value="">Select a subject...</option>` + optionsHtml;
  }
  if (schedSubSelect) {
    schedSubSelect.innerHTML = `<option value="">Select a subject...</option>` + optionsHtml;
  }
  if (noteSubSelect) {
    noteSubSelect.innerHTML = `<option value="">General (No specific subject)</option>` + optionsHtml;
  }
  if (pomoSubSelect) {
    pomoSubSelect.innerHTML = `<option value="">General Study</option>` + optionsHtml;
  }

  // Filter selects
  if (filterSubSelect) {
    const currentVal = filterSubSelect.value;
    filterSubSelect.innerHTML = `<option value="all">All Subjects</option>` + optionsHtml;
    filterSubSelect.value = currentVal || 'all';
  }
  if (schedFilterSelect) {
    const currentVal = schedFilterSelect.value;
    schedFilterSelect.innerHTML = `<option value="all">All Subjects</option>` + optionsHtml;
    schedFilterSelect.value = currentVal || 'all';
  }
}

function openSubjectModal(subjectToEdit = null) {
  const modal = document.getElementById('modal-subject');
  const form = document.getElementById('form-subject');
  const title = document.getElementById('modal-subject-title');
  const idInput = document.getElementById('subject-edit-id');
  const nameInput = document.getElementById('subject-name');
  const teacherInput = document.getElementById('subject-teacher');
  const priorityInput = document.getElementById('subject-priority');
  const hoursInput = document.getElementById('subject-hours');
  const colorValInput = document.getElementById('subject-color-val');
  const customColorInput = document.getElementById('subject-custom-color');

  clearFormErrors('form-subject');

  if (subjectToEdit) {
    title.textContent = 'Edit Subject';
    idInput.value = subjectToEdit.id;
    nameInput.value = subjectToEdit.name;
    teacherInput.value = subjectToEdit.teacher || '';
    priorityInput.value = subjectToEdit.priority || 'Medium';
    hoursInput.value = subjectToEdit.weeklyHours || 5;
    colorValInput.value = subjectToEdit.color || '#4f46e5';
    customColorInput.value = subjectToEdit.color || '#4f46e5';
  } else {
    title.textContent = 'Add New Subject';
    form.reset();
    idInput.value = '';
    hoursInput.value = 5;
    colorValInput.value = '#4f46e5';
    customColorInput.value = '#4f46e5';
  }

  // Update active color dot
  document.querySelectorAll('.color-dot').forEach(dot => {
    if (dot.getAttribute('data-color') === colorValInput.value) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  openModal('modal-subject');
}

function editSubject(subjectId) {
  const subject = appState.subjects.find(s => s.id === subjectId);
  if (subject) openSubjectModal(subject);
}

function handleSubjectSubmit(e) {
  e.preventDefault();
  clearFormErrors('form-subject');

  const id = document.getElementById('subject-edit-id').value;
  const name = document.getElementById('subject-name').value.trim();
  const teacher = document.getElementById('subject-teacher').value.trim();
  const priority = document.getElementById('subject-priority').value;
  const weeklyHours = parseInt(document.getElementById('subject-hours').value, 10);
  const color = document.getElementById('subject-color-val').value;

  // Validation
  let hasError = false;
  if (!name) {
    showFieldError('error-subject-name', 'Subject name cannot be empty.');
    hasError = true;
  }
  if (isNaN(weeklyHours) || weeklyHours < 1 || weeklyHours > 100) {
    showFieldError('error-subject-hours', 'Please enter a valid weekly study target (1-100 hours).');
    hasError = true;
  }

  if (hasError) return;

  if (id) {
    // Edit existing
    const index = appState.subjects.findIndex(s => s.id === id);
    if (index !== -1) {
      appState.subjects[index] = { ...appState.subjects[index], name, teacher, priority, weeklyHours, color };
      showToast('Subject updated successfully!', 'success');
    }
  } else {
    // Create new
    const newSubject = {
      id: generateId('sub'),
      name,
      teacher,
      priority,
      weeklyHours,
      color: color || '#4f46e5',
      createdAt: new Date().toISOString()
    };
    appState.subjects.push(newSubject);
    showToast('Subject added successfully!', 'success');
  }

  saveData();
  renderSubjects();
  updateDashboard();
  calculateProgress();
  closeModal('modal-subject');
}

function confirmDeleteSubject(subjectId) {
  const subject = appState.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  const linkedTasks = appState.tasks.filter(t => t.subjectId === subjectId).length;
  let confirmMsg = `Are you sure you want to delete "${escapeHtml(subject.name)}"?`;
  if (linkedTasks > 0) {
    confirmMsg += ` Warning: ${linkedTasks} task${linkedTasks === 1 ? '' : 's'} linked to this subject will also be affected.`;
  }

  openConfirmModal(confirmMsg, () => {
    // Delete subject
    appState.subjects = appState.subjects.filter(s => s.id !== subjectId);
    // Delete linked schedule sessions
    appState.schedule = appState.schedule.filter(s => s.subjectId !== subjectId);
    
    saveData();
    renderSubjects();
    renderTasks();
    renderSchedule();
    updateDashboard();
    calculateProgress();
    showToast('Subject deleted.', 'info');
  });
}

// --------------------------------------------------------------------------
// 8. TASK MANAGEMENT
// --------------------------------------------------------------------------
function renderTasks() {
  const container = document.getElementById('tasks-container');
  if (!container) return;

  // Retrieve current filters
  const searchKeyword = (document.getElementById('task-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('task-filter-status')?.value || 'all';
  const subjectFilter = document.getElementById('task-filter-subject')?.value || 'all';
  const priorityFilter = document.getElementById('task-filter-priority')?.value || 'all';
  const sortBy = document.getElementById('task-sort')?.value || 'deadline-asc';

  const todayStr = formatDateToYYYYMMDD(new Date());

  // Filter Tasks
  let filtered = appState.tasks.filter(task => {
    // Search match
    if (searchKeyword) {
      const matchTitle = task.title.toLowerCase().includes(searchKeyword);
      const matchDesc = (task.description || '').toLowerCase().includes(searchKeyword);
      if (!matchTitle && !matchDesc) return false;
    }

    // Status filter
    if (statusFilter === 'pending' && task.status !== 'Pending') return false;
    if (statusFilter === 'completed' && task.status !== 'Completed') return false;
    if (statusFilter === 'overdue' && (task.status !== 'Pending' || task.dueDate >= todayStr)) return false;

    // Subject filter
    if (subjectFilter !== 'all' && task.subjectId !== subjectFilter) return false;

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    return true;
  });

  // Sort Tasks
  filtered.sort((a, b) => {
    if (sortBy === 'deadline-asc') {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortBy === 'deadline-desc') {
      return b.dueDate.localeCompare(a.dueDate);
    }
    if (sortBy === 'priority-desc') {
      const pWeights = { High: 3, Medium: 2, Low: 1 };
      return (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
    }
    if (sortBy === 'priority-asc') {
      const pWeights = { High: 3, Medium: 2, Low: 1 };
      return (pWeights[a.priority] || 0) - (pWeights[b.priority] || 0);
    }
    if (sortBy === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Empty State
  if (filtered.length === 0) {
    let emptyMessage = "No tasks yet. Add your first study task.";
    if (searchKeyword || statusFilter !== 'all' || subjectFilter !== 'all' || priorityFilter !== 'all') {
      emptyMessage = "No tasks match your selected search and filters.";
    }

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-tasks"></i>
        </div>
        <h3 class="empty-state-title">${emptyMessage}</h3>
        <p class="empty-state-desc">Stay on top of college coursework, tests, and deliverables.</p>
        <button class="btn btn-primary" onclick="openTaskModal()">
          <i class="fas fa-plus"></i> Add New Task
        </button>
      </div>
    `;
    return;
  }

  // Render Tasks
  container.innerHTML = filtered.map(task => {
    const isCompleted = task.status === 'Completed';
    const subject = appState.subjects.find(s => s.id === task.subjectId);
    const subName = subject ? escapeHtml(subject.name) : 'General';
    const subColor = subject ? subject.color : '#64748b';

    const daysRemaining = calculateDaysRemaining(task.dueDate);
    let dueDateClass = '';
    let dueLabel = formatDisplayDate(task.dueDate);

    if (!isCompleted) {
      if (daysRemaining < 0) {
        dueDateClass = 'is-overdue';
        dueLabel = `Overdue (${Math.abs(daysRemaining)}d ago)`;
      } else if (daysRemaining === 0) {
        dueDateClass = 'is-overdue';
        dueLabel = `Due Today`;
      } else if (daysRemaining === 1) {
        dueLabel = `Due Tomorrow`;
      }
    }

    return `
      <div class="task-item ${isCompleted ? 'is-completed' : ''}" data-id="${task.id}">
        <div class="task-checkbox-container">
          <input 
            type="checkbox" 
            class="custom-checkbox" 
            ${isCompleted ? 'checked' : ''} 
            onchange="toggleTaskStatus('${task.id}')"
            aria-label="Mark task complete"
          >
        </div>

        <div class="task-main-content">
          <div class="task-header-row">
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <div class="task-actions">
              <button class="btn-icon" onclick="editTask('${task.id}')" title="Edit Task">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="btn-icon" onclick="confirmDeleteTask('${task.id}')" title="Delete Task">
                <i class="fas fa-trash-alt text-rose"></i>
              </button>
            </div>
          </div>

          ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}

          <div class="task-badges-row">
            <span class="tag-subject" style="background-color: ${subColor}20; color: ${subColor};">
              <span class="tag-subject-dot" style="background-color: ${subColor};"></span>
              ${subName}
            </span>

            <span class="tag-priority ${task.priority}">${task.priority}</span>

            <span class="tag-due-date ${dueDateClass}">
              <i class="far fa-calendar-alt"></i> ${dueLabel}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openTaskModal(taskToEdit = null, prefillDate = null) {
  // If no subjects exist, prompt to create one first
  if (appState.subjects.length === 0) {
    showToast('Please add at least one subject before creating tasks.', 'error');
    switchView('subjects');
    openSubjectModal();
    return;
  }

  const modal = document.getElementById('modal-task');
  const form = document.getElementById('form-task');
  const title = document.getElementById('modal-task-title');
  const idInput = document.getElementById('task-edit-id');
  const titleInput = document.getElementById('task-title');
  const subSelect = document.getElementById('task-subject-id');
  const dateInput = document.getElementById('task-due-date');
  const prioritySelect = document.getElementById('task-priority');
  const statusSelect = document.getElementById('task-status');
  const descInput = document.getElementById('task-desc');

  clearFormErrors('form-task');

  if (taskToEdit) {
    title.textContent = 'Edit Study Task';
    idInput.value = taskToEdit.id;
    titleInput.value = taskToEdit.title;
    subSelect.value = taskToEdit.subjectId;
    dateInput.value = taskToEdit.dueDate;
    prioritySelect.value = taskToEdit.priority;
    statusSelect.value = taskToEdit.status;
    descInput.value = taskToEdit.description || '';
  } else {
    title.textContent = 'Add New Task';
    form.reset();
    idInput.value = '';
    // Set default due date to today or prefillDate
    dateInput.value = prefillDate || formatDateToYYYYMMDD(new Date());
    prioritySelect.value = 'Medium';
    statusSelect.value = 'Pending';
  }

  openModal('modal-task');
}

function editTask(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (task) openTaskModal(task);
}

function handleTaskSubmit(e) {
  e.preventDefault();
  clearFormErrors('form-task');

  const id = document.getElementById('task-edit-id').value;
  const title = document.getElementById('task-title').value.trim();
  const subjectId = document.getElementById('task-subject-id').value;
  const dueDate = document.getElementById('task-due-date').value;
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;
  const description = document.getElementById('task-desc').value.trim();

  // Validation
  let hasError = false;
  if (!title) {
    showFieldError('error-task-title', 'Task title cannot be empty.');
    hasError = true;
  }
  if (!subjectId) {
    showFieldError('error-task-subject', 'Please select a subject.');
    hasError = true;
  }
  if (!dueDate) {
    showFieldError('error-task-date', 'Due date is required.');
    hasError = true;
  }

  if (hasError) return;

  if (id) {
    // Edit existing
    const index = appState.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      appState.tasks[index] = {
        ...appState.tasks[index],
        title,
        subjectId,
        dueDate,
        priority,
        status,
        description,
        completedAt: status === 'Completed' ? new Date().toISOString() : null
      };
      showToast('Task updated successfully!', 'success');
    }
  } else {
    // Add new
    const newTask = {
      id: generateId('task'),
      title,
      subjectId,
      dueDate,
      priority,
      status,
      description,
      createdAt: new Date().toISOString(),
      completedAt: status === 'Completed' ? new Date().toISOString() : null
    };
    appState.tasks.push(newTask);
    showToast('Task added successfully!', 'success');
  }

  saveData();
  renderTasks();
  updateDashboard();
  calculateProgress();
  renderCalendar();
  closeModal('modal-task');
}

function toggleTaskStatus(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
  task.completedAt = task.status === 'Completed' ? new Date().toISOString() : null;

  saveData();
  renderTasks();
  updateDashboard();
  calculateProgress();
  renderCalendar();

  const msg = task.status === 'Completed' ? 'Task marked as completed!' : 'Task marked as pending.';
  showToast(msg, 'info');
}

function confirmDeleteTask(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  openConfirmModal(`Are you sure you want to delete task "${escapeHtml(task.title)}"?`, () => {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    saveData();
    renderTasks();
    updateDashboard();
    calculateProgress();
    renderCalendar();
    showToast('Task deleted.', 'info');
  });
}

function filterTasksBySubject(subjectId) {
  switchView('tasks');
  const filterSubSelect = document.getElementById('task-filter-subject');
  if (filterSubSelect) {
    filterSubSelect.value = subjectId;
    renderTasks();
  }
}

// --------------------------------------------------------------------------
// 9. INTERACTIVE CALENDAR
// --------------------------------------------------------------------------
function renderCalendar() {
  const gridContainer = document.getElementById('calendar-days-grid');
  const monthYearHeader = document.getElementById('calendar-month-year');
  if (!gridContainer || !monthYearHeader) return;

  const currentYear = appState.calendarDate.getFullYear();
  const currentMonth = appState.calendarDate.getMonth();

  // Set Month Year title
  const monthName = appState.calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  monthYearHeader.textContent = monthName;

  // Calendar calculations
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  const lastDateOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const lastDayIndex = new Date(currentYear, currentMonth, lastDateOfMonth).getDay();
  const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();

  const todayStr = formatDateToYYYYMMDD(new Date());

  let calendarHtml = '';

  // 1. Previous month trailing padding days
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevMonthLastDate - i + 1;
    calendarHtml += `<div class="cal-day other-month"><span class="cal-day-num">${dayNum}</span></div>`;
  }

  // 2. Current month active days
  for (let date = 1; date <= lastDateOfMonth; date++) {
    const formattedDay = String(date).padStart(2, '0');
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const dayDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    const isToday = dayDateStr === todayStr ? 'is-today' : '';
    const isSelected = dayDateStr === appState.selectedDateStr ? 'is-selected' : '';

    // Find tasks & schedule on this date
    const dayTasks = appState.tasks.filter(t => t.dueDate === dayDateStr);
    const daySessions = appState.schedule.filter(s => s.date === dayDateStr);

    let eventsHtml = '';
    dayTasks.slice(0, 2).forEach(task => {
      eventsHtml += `<div class="cal-pill pill-task" title="${escapeHtml(task.title)}">• ${escapeHtml(task.title)}</div>`;
    });
    daySessions.slice(0, 1).forEach(sess => {
      eventsHtml += `<div class="cal-pill pill-session" title="${escapeHtml(sess.topic)}">🕒 ${escapeHtml(sess.topic)}</div>`;
    });

    const moreCount = (dayTasks.length + daySessions.length) - 3;
    if (moreCount > 0) {
      eventsHtml += `<div class="cal-pill" style="font-size: 0.65rem; color: var(--text-muted);">+${moreCount} more</div>`;
    }

    calendarHtml += `
      <div class="cal-day ${isToday} ${isSelected}" data-date="${dayDateStr}" onclick="selectCalendarDate('${dayDateStr}')">
        <span class="cal-day-num">${date}</span>
        <div class="cal-day-events">${eventsHtml}</div>
      </div>
    `;
  }

  // 3. Next month leading padding days
  const nextDays = 6 - lastDayIndex;
  for (let j = 1; j <= nextDays; j++) {
    calendarHtml += `<div class="cal-day other-month"><span class="cal-day-num">${j}</span></div>`;
  }

  gridContainer.innerHTML = calendarHtml;

  // Update Inspector Panel with details of selected date
  updateCalendarInspector();
}

function selectCalendarDate(dateStr) {
  appState.selectedDateStr = dateStr;
  
  // Highlight visually
  document.querySelectorAll('.cal-day').forEach(el => {
    if (el.getAttribute('data-date') === dateStr) {
      el.classList.add('is-selected');
    } else {
      el.classList.remove('is-selected');
    }
  });

  updateCalendarInspector();
}

function updateCalendarInspector() {
  const inspectorTitle = document.getElementById('inspector-selected-date');
  const tasksContainer = document.getElementById('inspector-tasks-list');
  const sessionsContainer = document.getElementById('inspector-sessions-list');
  if (!inspectorTitle || !tasksContainer || !sessionsContainer) return;

  const dateStr = appState.selectedDateStr;
  inspectorTitle.textContent = formatDisplayDate(dateStr);

  // Inspector Tasks
  const dayTasks = appState.tasks.filter(t => t.dueDate === dateStr);
  if (dayTasks.length === 0) {
    tasksContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No task deadlines for this date.</p>`;
  } else {
    tasksContainer.innerHTML = dayTasks.map(t => {
      const sub = appState.subjects.find(s => s.id === t.subjectId);
      const subColor = sub ? sub.color : 'var(--brand-primary)';
      return `
        <div class="inspector-item" style="border-left-color: ${subColor};">
          <strong style="${t.status === 'Completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
            ${escapeHtml(t.title)}
          </strong>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
            ${sub ? escapeHtml(sub.name) : 'General'} • Priority: ${t.priority}
          </div>
        </div>
      `;
    }).join('');
  }

  // Inspector Sessions
  const daySessions = appState.schedule.filter(s => s.date === dateStr);
  if (daySessions.length === 0) {
    sessionsContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No study sessions planned.</p>`;
  } else {
    sessionsContainer.innerHTML = daySessions.map(s => {
      const sub = appState.subjects.find(sub => sub.id === s.subjectId);
      const subColor = sub ? sub.color : 'var(--brand-secondary)';
      return `
        <div class="inspector-item" style="border-left-color: ${subColor};">
          <strong>${escapeHtml(s.topic)}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
            <i class="far fa-clock"></i> ${formatTime12Hour(s.startTime)} - ${formatTime12Hour(s.endTime)}
          </div>
        </div>
      `;
    }).join('');
  }
}

// --------------------------------------------------------------------------
// 10. STUDY SCHEDULE MANAGEMENT
// --------------------------------------------------------------------------
function renderSchedule() {
  const container = document.getElementById('schedule-container');
  if (!container) return;

  const rangeFilter = document.getElementById('schedule-filter-range')?.value || 'all';
  const subjectFilter = document.getElementById('schedule-filter-subject')?.value || 'all';
  const todayStr = formatDateToYYYYMMDD(new Date());

  // Filter
  let filtered = appState.schedule.filter(session => {
    if (rangeFilter === 'today' && session.date !== todayStr) return false;
    if (rangeFilter === 'upcoming' && session.date < todayStr) return false;
    if (rangeFilter === 'past' && session.date >= todayStr) return false;
    if (subjectFilter !== 'all' && session.subjectId !== subjectFilter) return false;
    return true;
  });

  // Sort Chronologically: date ascending, start time ascending
  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-clock"></i>
        </div>
        <h3 class="empty-state-title">No study sessions found.</h3>
        <p class="empty-state-desc">Schedule specific study time blocks to stay consistent and stress-free.</p>
        <button class="btn btn-primary" onclick="openScheduleModal()">
          <i class="fas fa-plus"></i> Schedule First Session
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(session => {
    const subject = appState.subjects.find(s => s.id === session.subjectId);
    const subName = subject ? escapeHtml(subject.name) : 'General Study';
    const subColor = subject ? subject.color : 'var(--brand-primary)';

    const durationText = calculateDuration(session.startTime, session.endTime);

    return `
      <div class="schedule-card" data-id="${session.id}">
        <div class="schedule-card-accent" style="background-color: ${subColor};"></div>
        
        <div class="schedule-time-box">
          <span class="schedule-time-range">${formatTime12Hour(session.startTime)} - ${formatTime12Hour(session.endTime)}</span>
          <span class="schedule-duration-badge">${durationText}</span>
        </div>

        <div class="schedule-info-box">
          <h4 class="schedule-topic">${escapeHtml(session.topic)}</h4>
          <div class="schedule-meta-row">
            <span style="font-weight: 600; color: ${subColor};">
              <i class="fas fa-book-open"></i> ${subName}
            </span>
            <span>•</span>
            <span><i class="far fa-calendar"></i> ${formatDisplayDate(session.date)}</span>
          </div>
        </div>

        <div class="schedule-actions">
          <button class="btn-icon" onclick="editSchedule('${session.id}')" title="Edit Session">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="btn-icon" onclick="confirmDeleteSchedule('${session.id}')" title="Delete Session">
            <i class="fas fa-trash-alt text-rose"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openScheduleModal(sessionToEdit = null) {
  if (appState.subjects.length === 0) {
    showToast('Please add at least one subject before scheduling study sessions.', 'error');
    switchView('subjects');
    openSubjectModal();
    return;
  }

  const modal = document.getElementById('modal-schedule');
  const form = document.getElementById('form-schedule');
  const title = document.getElementById('modal-schedule-title');
  const idInput = document.getElementById('schedule-edit-id');
  const subSelect = document.getElementById('schedule-subject-id');
  const topicInput = document.getElementById('schedule-topic');
  const dateInput = document.getElementById('schedule-date');
  const startInput = document.getElementById('schedule-start-time');
  const endInput = document.getElementById('schedule-end-time');

  clearFormErrors('form-schedule');

  if (sessionToEdit) {
    title.textContent = 'Edit Study Session';
    idInput.value = sessionToEdit.id;
    subSelect.value = sessionToEdit.subjectId;
    topicInput.value = sessionToEdit.topic;
    dateInput.value = sessionToEdit.date;
    startInput.value = sessionToEdit.startTime;
    endInput.value = sessionToEdit.endTime;
  } else {
    title.textContent = 'Schedule Study Session';
    form.reset();
    idInput.value = '';
    dateInput.value = formatDateToYYYYMMDD(new Date());
    startInput.value = '14:00';
    endInput.value = '15:30';
  }

  openModal('modal-schedule');
}

function editSchedule(sessionId) {
  const session = appState.schedule.find(s => s.id === sessionId);
  if (session) openScheduleModal(session);
}

function handleScheduleSubmit(e) {
  e.preventDefault();
  clearFormErrors('form-schedule');

  const id = document.getElementById('schedule-edit-id').value;
  const subjectId = document.getElementById('schedule-subject-id').value;
  const topic = document.getElementById('schedule-topic').value.trim();
  const date = document.getElementById('schedule-date').value;
  const startTime = document.getElementById('schedule-start-time').value;
  const endTime = document.getElementById('schedule-end-time').value;

  // Validation
  let hasError = false;
  if (!subjectId) {
    showFieldError('error-schedule-subject', 'Please select a subject.');
    hasError = true;
  }
  if (!topic) {
    showFieldError('error-schedule-topic', 'Study topic or goal cannot be empty.');
    hasError = true;
  }
  if (!date) {
    showFieldError('error-schedule-date', 'Date is required.');
    hasError = true;
  }
  if (!startTime) {
    showFieldError('error-schedule-start', 'Start time is required.');
    hasError = true;
  }
  if (!endTime) {
    showFieldError('error-schedule-end', 'End time is required.');
    hasError = true;
  }

  // Prevent end time before or equal to start time
  if (startTime && endTime && endTime <= startTime) {
    showFieldError('error-schedule-end', 'End time must be after start time.');
    hasError = true;
  }

  if (hasError) return;

  if (id) {
    // Edit existing
    const index = appState.schedule.findIndex(s => s.id === id);
    if (index !== -1) {
      appState.schedule[index] = { ...appState.schedule[index], subjectId, topic, date, startTime, endTime };
      showToast('Study session updated!', 'success');
    }
  } else {
    // New session
    const newSession = {
      id: generateId('sched'),
      subjectId,
      topic,
      date,
      startTime,
      endTime,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    };
    appState.schedule.push(newSession);
    showToast('Study session scheduled!', 'success');
  }

  saveData();
  renderSchedule();
  updateDashboard();
  renderCalendar();
  closeModal('modal-schedule');
}

function confirmDeleteSchedule(sessionId) {
  const session = appState.schedule.find(s => s.id === sessionId);
  if (!session) return;

  openConfirmModal(`Delete study session for "${escapeHtml(session.topic)}"?`, () => {
    appState.schedule = appState.schedule.filter(s => s.id !== sessionId);
    saveData();
    renderSchedule();
    updateDashboard();
    renderCalendar();
    showToast('Study session deleted.', 'info');
  });
}

// --------------------------------------------------------------------------
// 11. POMODORO FOCUS TIMER
// --------------------------------------------------------------------------
function setupPomodoroTimer() {
  const pomoDisplay = document.getElementById('pomo-display');
  const btnStart = document.getElementById('pomo-btn-start');
  const btnReset = document.getElementById('pomo-btn-reset');
  const btnSkip = document.getElementById('pomo-btn-skip');
  const modeButtons = document.querySelectorAll('.pomo-mode-btn');

  // Mode Switcher
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setPomodoroMode(mode);
    });
  });

  // Start / Pause
  if (btnStart) {
    btnStart.addEventListener('click', togglePomodoroTimer);
  }

  // Reset
  if (btnReset) {
    btnReset.addEventListener('click', resetPomodoroTimer);
  }

  // Skip
  if (btnSkip) {
    btnSkip.addEventListener('click', skipPomodoroMode);
  }

  updatePomodoroDisplay();
  updatePomodoroStatsDisplay();
}

function setPomodoroMode(mode) {
  if (appState.timer.isRunning) {
    pausePomodoroTimer();
  }

  appState.timer.mode = mode;
  appState.timer.timeLeft = appState.timer.durations[mode];

  // Update UI active tab
  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const labelElem = document.getElementById('pomo-mode-label');
  if (labelElem) {
    if (mode === 'pomodoro') labelElem.textContent = 'Focus Session';
    else if (mode === 'shortBreak') labelElem.textContent = 'Short Break';
    else if (mode === 'longBreak') labelElem.textContent = 'Long Break';
  }

  updatePomodoroDisplay();
}

function togglePomodoroTimer() {
  if (appState.timer.isRunning) {
    pausePomodoroTimer();
  } else {
    startPomodoroTimer();
  }
}

function startPomodoroTimer() {
  appState.timer.isRunning = true;

  const btnStart = document.getElementById('pomo-btn-start');
  const icon = document.getElementById('pomo-start-icon');
  const text = document.getElementById('pomo-start-text');
  const headerPill = document.getElementById('header-timer-pill');

  if (icon) icon.className = 'fas fa-pause';
  if (text) text.textContent = 'Pause';
  if (headerPill) headerPill.style.display = 'flex';

  appState.timer.intervalId = setInterval(() => {
    if (appState.timer.timeLeft > 0) {
      appState.timer.timeLeft--;
      updatePomodoroDisplay();
    } else {
      handlePomodoroComplete();
    }
  }, 1000);
}

function pausePomodoroTimer() {
  appState.timer.isRunning = false;
  if (appState.timer.intervalId) {
    clearInterval(appState.timer.intervalId);
    appState.timer.intervalId = null;
  }

  const icon = document.getElementById('pomo-start-icon');
  const text = document.getElementById('pomo-start-text');
  const headerPill = document.getElementById('header-timer-pill');

  if (icon) icon.className = 'fas fa-play';
  if (text) text.textContent = 'Resume';
  if (headerPill) headerPill.style.display = 'none';
}

function resetPomodoroTimer() {
  pausePomodoroTimer();
  appState.timer.timeLeft = appState.timer.durations[appState.timer.mode];
  
  const text = document.getElementById('pomo-start-text');
  if (text) text.textContent = 'Start Focus';

  updatePomodoroDisplay();
}

function skipPomodoroMode() {
  pausePomodoroTimer();
  if (appState.timer.mode === 'pomodoro') {
    setPomodoroMode('shortBreak');
  } else {
    setPomodoroMode('pomodoro');
  }
}

function handlePomodoroComplete() {
  pausePomodoroTimer();
  playPomodoroChime();

  if (appState.timer.mode === 'pomodoro') {
    // Record stats
    appState.pomodoroStats.completedToday++;
    appState.pomodoroStats.totalMinutes += 25;
    saveData();
    updatePomodoroStatsDisplay();
    updateDashboard();
    calculateProgress();

    showToast('Focus session complete! Take a well-deserved break.', 'success');
    setPomodoroMode('shortBreak');
  } else {
    showToast('Break finished! Ready to focus again?', 'info');
    setPomodoroMode('pomodoro');
  }
}

function updatePomodoroDisplay() {
  const minutes = Math.floor(appState.timer.timeLeft / 60);
  const seconds = appState.timer.timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const pomoDisplay = document.getElementById('pomo-display');
  const headerTimerDisplay = document.getElementById('header-timer-display');
  if (pomoDisplay) pomoDisplay.textContent = timeFormatted;
  if (headerTimerDisplay) headerTimerDisplay.textContent = timeFormatted;

  // Animate SVG Ring
  const total = appState.timer.durations[appState.timer.mode];
  const progressRatio = appState.timer.timeLeft / total;
  const ringFill = document.getElementById('pomo-ring-fill');
  
  // Circumference = 2 * PI * 125 = ~785.4
  const circumference = 785.4;
  if (ringFill) {
    const offset = circumference * (1 - progressRatio);
    ringFill.style.strokeDashoffset = offset;
  }
}

function updatePomodoroStatsDisplay() {
  const completedElem = document.getElementById('pomo-stat-completed');
  const minutesElem = document.getElementById('pomo-stat-minutes');

  if (completedElem) completedElem.textContent = appState.pomodoroStats.completedToday;
  if (minutesElem) minutesElem.textContent = `${appState.pomodoroStats.totalMinutes}m`;
}

/**
 * Synthesizes an audio notification chime using the standard HTML5 Web Audio API.
 * Guaranteed to work offline with zero external audio assets!
 */
function playPomodoroChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Harmonic notes (E5 to A5 chime)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch (err) {
    console.warn('Web Audio chime not supported or muted by browser policy:', err);
  }
}

// --------------------------------------------------------------------------
// 12. PROGRESS & ANALYTICS
// --------------------------------------------------------------------------
function calculateProgress() {
  const totalTasks = appState.tasks.length;
  const completedTasks = appState.tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = appState.tasks.filter(t => t.status === 'Pending').length;
  const todayStr = formatDateToYYYYMMDD(new Date());
  const overdueTasks = appState.tasks.filter(t => t.status === 'Pending' && t.dueDate < todayStr).length;

  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Elements
  const rateValElem = document.getElementById('analytics-rate-val');
  const totalElem = document.getElementById('analytics-stat-total');
  const completedElem = document.getElementById('analytics-stat-completed');
  const pendingElem = document.getElementById('analytics-stat-pending');
  const overdueElem = document.getElementById('analytics-stat-overdue');
  const gaugeFill = document.getElementById('analytics-gauge-fill');

  if (rateValElem) rateValElem.textContent = `${rate}%`;
  if (totalElem) totalElem.textContent = totalTasks;
  if (completedElem) completedElem.textContent = completedTasks;
  if (pendingElem) pendingElem.textContent = pendingTasks;
  if (overdueElem) overdueElem.textContent = overdueTasks;

  // SVG circular gauge (Circumference = 2 * PI * 70 = ~439.8)
  if (gaugeFill) {
    const circumference = 439.8;
    const offset = circumference * (1 - (rate / 100));
    gaugeFill.style.strokeDashoffset = offset;
  }

  // Priority Bars breakdown
  renderAnalyticsPriorityBars();

  // Subject Target Hours breakdown
  renderAnalyticsSubjectBars();
}

function renderAnalyticsPriorityBars() {
  const container = document.getElementById('analytics-priority-bars');
  if (!container) return;

  const priorities = ['High', 'Medium', 'Low'];
  const colors = {
    High: 'var(--color-danger)',
    Medium: 'var(--color-warning)',
    Low: 'var(--color-success)'
  };

  const total = appState.tasks.length;

  container.innerHTML = priorities.map(pri => {
    const count = appState.tasks.filter(t => t.priority === pri).length;
    const completedCount = appState.tasks.filter(t => t.priority === pri && t.status === 'Completed').length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return `
      <div class="priority-bar-item">
        <div class="bar-meta-row">
          <span>${pri} Priority</span>
          <span>${count} tasks (${completedCount} done) • ${percent}%</span>
        </div>
        <div class="chart-track">
          <div class="chart-fill" style="width: ${percent}%; background-color: ${colors[pri]};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalyticsSubjectBars() {
  const container = document.getElementById('analytics-subject-bars');
  if (!container) return;

  if (appState.subjects.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No subjects to display.</p>`;
    return;
  }

  const maxHours = Math.max(...appState.subjects.map(s => s.weeklyHours), 10);

  container.innerHTML = appState.subjects.map(sub => {
    const percent = Math.min(Math.round((sub.weeklyHours / maxHours) * 100), 100);

    return `
      <div class="subject-bar-item">
        <div class="bar-meta-row">
          <span style="display: flex; align-items: center; gap: 0.45rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${sub.color};"></span>
            ${escapeHtml(sub.name)}
          </span>
          <span>${sub.weeklyHours} hrs / week</span>
        </div>
        <div class="chart-track">
          <div class="chart-fill" style="width: ${percent}%; background-color: ${sub.color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 13. NOTES MANAGEMENT
// --------------------------------------------------------------------------
function renderNotes() {
  const container = document.getElementById('notes-container');
  if (!container) return;

  const searchKeyword = (document.getElementById('note-search-input')?.value || '').toLowerCase().trim();

  let filtered = appState.notes.filter(note => {
    if (!searchKeyword) return true;
    return note.title.toLowerCase().includes(searchKeyword) || note.content.toLowerCase().includes(searchKeyword);
  });

  // Sort newest notes first
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    const msg = searchKeyword ? "No notes matching your search." : "No notes available.";
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <i class="fas fa-sticky-note"></i>
        </div>
        <h3 class="empty-state-title">${msg}</h3>
        <p class="empty-state-desc">Capture quick formulas, lecture notes, exam tips, and ideas.</p>
        <button class="btn btn-primary" onclick="openNoteModal()">
          <i class="fas fa-plus"></i> Add New Note
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(note => {
    const subject = appState.subjects.find(s => s.id === note.subjectId);
    const subName = subject ? escapeHtml(subject.name) : 'General';
    const subColor = subject ? subject.color : 'var(--brand-primary)';

    return `
      <div class="note-card" data-id="${note.id}">
        <div class="note-header">
          <h4 class="note-title">${escapeHtml(note.title)}</h4>
          <span class="note-tag" style="background-color: ${subColor}20; color: ${subColor};">
            ${subName}
          </span>
        </div>
        
        <div class="note-body">${escapeHtml(note.content)}</div>

        <div class="note-footer">
          <span><i class="far fa-clock"></i> ${formatDisplayDate(note.createdAt.split('T')[0])}</span>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn-icon" onclick="editNote('${note.id}')" title="Edit Note">
              <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="btn-icon" onclick="confirmDeleteNote('${note.id}')" title="Delete Note">
              <i class="fas fa-trash-alt text-rose"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openNoteModal(noteToEdit = null) {
  const modal = document.getElementById('modal-note');
  const form = document.getElementById('form-note');
  const title = document.getElementById('modal-note-title');
  const idInput = document.getElementById('note-edit-id');
  const titleInput = document.getElementById('note-title');
  const subSelect = document.getElementById('note-subject-id');
  const contentInput = document.getElementById('note-content');

  clearFormErrors('form-note');

  if (noteToEdit) {
    title.textContent = 'Edit Note';
    idInput.value = noteToEdit.id;
    titleInput.value = noteToEdit.title;
    subSelect.value = noteToEdit.subjectId || '';
    contentInput.value = noteToEdit.content;
  } else {
    title.textContent = 'Add Note';
    form.reset();
    idInput.value = '';
  }

  openModal('modal-note');
}

function editNote(noteId) {
  const note = appState.notes.find(n => n.id === noteId);
  if (note) openNoteModal(note);
}

function handleNoteSubmit(e) {
  e.preventDefault();
  clearFormErrors('form-note');

  const id = document.getElementById('note-edit-id').value;
  const title = document.getElementById('note-title').value.trim();
  const subjectId = document.getElementById('note-subject-id').value;
  const content = document.getElementById('note-content').value.trim();

  // Validation
  let hasError = false;
  if (!title) {
    showFieldError('error-note-title', 'Note title cannot be empty.');
    hasError = true;
  }
  if (!content) {
    showFieldError('error-note-content', 'Note content cannot be empty.');
    hasError = true;
  }

  if (hasError) return;

  if (id) {
    // Edit
    const index = appState.notes.findIndex(n => n.id === id);
    if (index !== -1) {
      appState.notes[index] = { ...appState.notes[index], title, subjectId, content, updatedAt: new Date().toISOString() };
      showToast('Note updated successfully!', 'success');
    }
  } else {
    // New
    const newNote = {
      id: generateId('note'),
      title,
      subjectId,
      content,
      createdAt: new Date().toISOString()
    };
    appState.notes.push(newNote);
    showToast('Note saved successfully!', 'success');
  }

  saveData();
  renderNotes();
  closeModal('modal-note');
}

function confirmDeleteNote(noteId) {
  const note = appState.notes.find(n => n.id === noteId);
  if (!note) return;

  openConfirmModal(`Are you sure you want to delete note "${escapeHtml(note.title)}"?`, () => {
    appState.notes = appState.notes.filter(n => n.id !== noteId);
    saveData();
    renderNotes();
    showToast('Note deleted.', 'info');
  });
}

// --------------------------------------------------------------------------
// 14. MODAL & EVENT LISTENERS SETUP
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Theme Toggles
  document.getElementById('theme-checkbox')?.addEventListener('change', toggleTheme);
  document.getElementById('btn-desktop-theme')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-mobile-theme')?.addEventListener('click', toggleTheme);

  // Quick Action Buttons
  document.getElementById('btn-quick-add-task')?.addEventListener('click', () => openTaskModal());
  document.getElementById('qa-add-task')?.addEventListener('click', () => openTaskModal());
  document.getElementById('qa-add-subject')?.addEventListener('click', () => openSubjectModal());
  document.getElementById('qa-add-session')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btn-dash-add-session')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('qa-start-timer')?.addEventListener('click', () => switchView('pomodoro'));

  // Section Toolbar Add Buttons
  document.getElementById('btn-open-subject-modal')?.addEventListener('click', () => openSubjectModal());
  document.getElementById('btn-open-task-modal')?.addEventListener('click', () => openTaskModal());
  document.getElementById('btn-open-schedule-modal')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btn-open-note-modal')?.addEventListener('click', () => openNoteModal());
  document.getElementById('btn-inspector-add-task')?.addEventListener('click', () => {
    openTaskModal(null, appState.selectedDateStr);
  });

  // Task Filter & Search Listeners
  const taskSearchInput = document.getElementById('task-search-input');
  const taskSearchClear = document.getElementById('task-search-clear');
  if (taskSearchInput) {
    taskSearchInput.addEventListener('input', () => {
      if (taskSearchClear) taskSearchClear.style.display = taskSearchInput.value ? 'block' : 'none';
      renderTasks();
    });
  }
  if (taskSearchClear) {
    taskSearchClear.addEventListener('click', () => {
      taskSearchInput.value = '';
      taskSearchClear.style.display = 'none';
      renderTasks();
    });
  }

  document.getElementById('task-filter-status')?.addEventListener('change', renderTasks);
  document.getElementById('task-filter-subject')?.addEventListener('change', renderTasks);
  document.getElementById('task-filter-priority')?.addEventListener('change', renderTasks);
  document.getElementById('task-sort')?.addEventListener('change', renderTasks);

  // Schedule Filter Listeners
  document.getElementById('schedule-filter-range')?.addEventListener('change', renderSchedule);
  document.getElementById('schedule-filter-subject')?.addEventListener('change', renderSchedule);

  // Note Search Listeners
  const noteSearchInput = document.getElementById('note-search-input');
  const noteSearchClear = document.getElementById('note-search-clear');
  if (noteSearchInput) {
    noteSearchInput.addEventListener('input', () => {
      if (noteSearchClear) noteSearchClear.style.display = noteSearchInput.value ? 'block' : 'none';
      renderNotes();
    });
  }
  if (noteSearchClear) {
    noteSearchClear.addEventListener('click', () => {
      noteSearchInput.value = '';
      noteSearchClear.style.display = 'none';
      renderNotes();
    });
  }

  // Calendar Month Navigation Buttons
  document.getElementById('cal-btn-prev')?.addEventListener('click', () => {
    appState.calendarDate.setMonth(appState.calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-btn-next')?.addEventListener('click', () => {
    appState.calendarDate.setMonth(appState.calendarDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('cal-btn-today')?.addEventListener('click', () => {
    appState.calendarDate = new Date();
    appState.selectedDateStr = formatDateToYYYYMMDD(new Date());
    renderCalendar();
  });

  // Color picker presets for Subject form
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const selectedColor = dot.getAttribute('data-color');
      document.getElementById('subject-color-val').value = selectedColor;
      document.getElementById('subject-custom-color').value = selectedColor;
    });
  });

  const customColorInput = document.getElementById('subject-custom-color');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      document.getElementById('subject-color-val').value = e.target.value;
    });
  }

  // Form Submissions
  document.getElementById('form-subject')?.addEventListener('submit', handleSubjectSubmit);
  document.getElementById('form-task')?.addEventListener('submit', handleTaskSubmit);
  document.getElementById('form-schedule')?.addEventListener('submit', handleScheduleSubmit);
  document.getElementById('form-note')?.addEventListener('submit', handleNoteSubmit);

  // Keyboard shortcut: Escape closes active modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });
}

function setupModalHandlers() {
  // Generic close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('active');
    });
  });

  // Close when clicking on backdrop
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Confirm Delete Action button
  document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
    if (typeof appState.confirmCallback === 'function') {
      appState.confirmCallback();
      appState.confirmCallback = null;
    }
    closeModal('modal-confirm');
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function openConfirmModal(message, onConfirm) {
  const msgElem = document.getElementById('confirm-modal-message');
  if (msgElem) msgElem.textContent = message;
  appState.confirmCallback = onConfirm;
  openModal('modal-confirm');
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function showFieldError(errorElemId, message) {
  const errorElem = document.getElementById(errorElemId);
  if (errorElem) {
    errorElem.textContent = message;
    errorElem.classList.add('visible');
  }
}

// --------------------------------------------------------------------------
// 15. TOAST NOTIFICATIONS
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fas fa-info-circle';
  if (type === 'success') iconClass = 'fas fa-check-circle';
  if (type === 'error') iconClass = 'fas fa-exclamation-circle';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// --------------------------------------------------------------------------
// 16. BADGES & COUNTERS
// --------------------------------------------------------------------------
function updateBadges() {
  const badgeSubjects = document.getElementById('badge-subjects-count');
  const badgeTasks = document.getElementById('badge-tasks-count');
  const badgeNotes = document.getElementById('badge-notes-count');

  if (badgeSubjects) badgeSubjects.textContent = appState.subjects.length;
  if (badgeTasks) {
    const pendingCount = appState.tasks.filter(t => t.status === 'Pending').length;
    badgeTasks.textContent = pendingCount;
  }
  if (badgeNotes) badgeNotes.textContent = appState.notes.length;
}

// --------------------------------------------------------------------------
// 17. UTILITY & HELPER FUNCTIONS
// --------------------------------------------------------------------------
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function formatDateToYYYYMMDD(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12Hour(time24) {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minStr} ${ampm}`;
}

function calculateDuration(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let totalMin = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMin <= 0) totalMin = 60; // fallback

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} mins`;
}

function calculateDaysRemaining(targetDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --------------------------------------------------------------------------
// 18. REALISTIC INITIAL SAMPLE DATA
// --------------------------------------------------------------------------
function getSampleSubjects() {
  return [
    {
      id: 'sub_cs101',
      name: 'Data Structures & Algorithms',
      teacher: 'Prof. Katherine Johnson',
      priority: 'High',
      weeklyHours: 8,
      color: '#4f46e5'
    },
    {
      id: 'sub_calc',
      name: 'Calculus III',
      teacher: 'Dr. Bernhard Riemann',
      priority: 'High',
      weeklyHours: 6,
      color: '#0ea5e9'
    },
    {
      id: 'sub_phys',
      name: 'Physics: Electromagnetism',
      teacher: 'Dr. Richard Feynman',
      priority: 'Medium',
      weeklyHours: 5,
      color: '#10b981'
    },
    {
      id: 'sub_lit',
      name: 'World Literature & Rhetoric',
      teacher: 'Prof. Maya Angelou',
      priority: 'Low',
      weeklyHours: 3,
      color: '#f59e0b'
    }
  ];
}

function getSampleTasks() {
  const now = new Date();
  
  // Date helpers for relative dates
  const addDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatDateToYYYYMMDD(d);
  };

  return [
    {
      id: 'task_1',
      title: 'Implement Red-Black Tree in C++',
      subjectId: 'sub_cs101',
      description: 'Implement balance rotations and insertion tests for assignment 4.',
      dueDate: addDays(0), // Today
      priority: 'High',
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_2',
      title: 'Vector Calculus Problem Set #5',
      subjectId: 'sub_calc',
      description: 'Solve problems on Green\'s Theorem and Stokes\' Theorem from textbook ch 16.',
      dueDate: addDays(1), // Tomorrow
      priority: 'High',
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_3',
      title: 'Physics Lab Report: Maxwell Equations',
      subjectId: 'sub_phys',
      description: 'Write up experimental results from oscilloscope measurement lab.',
      dueDate: addDays(3),
      priority: 'Medium',
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_4',
      title: 'Literature Critical Essay Draft',
      subjectId: 'sub_lit',
      description: 'First draft analyzing themes of existentialism in 20th century poetry (1,200 words).',
      dueDate: addDays(5),
      priority: 'Medium',
      status: 'Pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_5',
      title: 'Review Sorting Algorithms Complexity Quiz',
      subjectId: 'sub_cs101',
      description: 'Quicksort, Mergesort, and Heapsort worst/average cases.',
      dueDate: addDays(-1), // Yesterday
      priority: 'Low',
      status: 'Completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }
  ];
}

function getSampleSchedule() {
  const now = new Date();
  const addDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatDateToYYYYMMDD(d);
  };

  return [
    {
      id: 'sched_1',
      subjectId: 'sub_cs101',
      topic: 'Binary Search Tree Rotations & Code Practice',
      date: addDays(0), // Today
      startTime: '10:00',
      endTime: '11:30',
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sched_2',
      subjectId: 'sub_calc',
      topic: 'Line Integrals & Vector Fields Review',
      date: addDays(0), // Today
      startTime: '14:00',
      endTime: '15:30',
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sched_3',
      subjectId: 'sub_phys',
      topic: 'Magnetic Flux & Faraday\'s Induction Law',
      date: addDays(1), // Tomorrow
      startTime: '11:00',
      endTime: '12:30',
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    }
  ];
}

function getSampleNotes() {
  return [
    {
      id: 'note_1',
      title: 'Master Theorem for Divide & Conquer',
      subjectId: 'sub_cs101',
      content: 'T(n) = aT(n/b) + f(n)\n• Case 1: f(n) = O(n^(log_b(a) - ε)) => T(n) = Θ(n^(log_b(a)))\n• Case 2: f(n) = Θ(n^(log_b(a))) => T(n) = Θ(n^(log_b(a)) * log n)\n• Case 3: f(n) = Ω(n^(log_b(a) + ε)) => T(n) = Θ(f(n))',
      createdAt: new Date().toISOString()
    },
    {
      id: 'note_2',
      title: 'Green\'s Theorem Formula',
      subjectId: 'sub_calc',
      content: '∮_C (L dx + M dy) = ∬_D (∂M/∂x - ∂L/∂y) dA\nUseful for converting line integrals along closed positively oriented curves into double integrals over the enclosed region D.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'note_3',
      title: 'Exam Preparation Strategy',
      subjectId: '',
      content: '1. Do practice problem sets under timed conditions.\n2. Formulate 1-page summary sheets for each unit.\n3. Use active recall with 25-minute Pomodoro focus blocks.',
      createdAt: new Date().toISOString()
    }
  ];
}
