document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const mobileMenuOpen = document.getElementById('mobile-menu-open');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');
  const btnPrint = document.getElementById('btn-print');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnClearSections = document.querySelectorAll('.btn-clear-section');
  const btnSaveReport = document.getElementById('btn-save-report');
  const snapshotViewer = document.getElementById('snapshot-viewer');
  const streakCounter = document.getElementById('home-streak-counter');
  const btnAddReport = document.getElementById('btn-add-report');
  
  // Summary Elements
  const summaryGoal = document.getElementById('summary-goal');
  const summaryFocus = document.getElementById('summary-focus');
  const summaryPlan = document.getElementById('summary-plan');
  const summaryChunk = document.getElementById('summary-chunk');
  
  const btnAddGoal = document.getElementById('btn-add-goal');
  const btnEditGoal = document.getElementById('btn-edit-goal');
  const btnAddFocus = document.getElementById('btn-add-focus');
  const btnEditFocus = document.getElementById('btn-edit-focus');
  const btnAddChunk = document.getElementById('btn-add-chunk');
  const btnEditChunk = document.getElementById('btn-edit-chunk');

  // Specific Save Buttons
  const btnSaveGoal = document.getElementById('btn-save-goal');
  const btnSaveContract = document.getElementById('btn-save-contract');
  const btnSavePlan = document.getElementById('btn-save-plan');
  const btnSaveChunk = document.getElementById('btn-save-chunk');
  const btnSaveProcrastination = document.getElementById('btn-save-procrastination');
  
  // Calendar Elements
  const calMonthYear = document.getElementById('cal-month-year');
  const calGrid = document.getElementById('calendar-grid');
  const btnCalPrev = document.getElementById('cal-prev');
  const btnCalNext = document.getElementById('cal-next');

  // Pomodoro Elements
  const pomoTime = document.getElementById('pomodoro-time');
  const pomoMode = document.getElementById('pomodoro-mode');
  const btnPomoStart = document.getElementById('pomo-start');
  const btnPomoPause = document.getElementById('pomo-pause');
  const btnPomoReset = document.getElementById('pomo-reset');
  
  // Data model binding elements
  const dataElements = document.querySelectorAll('[data-model]');
  const procrastinationRadios = document.querySelectorAll('input[name="procrastination"]');
  const procrastinationAlert = document.getElementById('procrastination-alert');

  // Storage Key
  const STORAGE_KEY = 'learningJournalData';

  // State
  let journalData = loadData();

  // Pomodoro State
  let pomoTimer = null;
  let pomoTimeLeft = 25 * 60; // 25 minutes
  let pomoIsFocus = true;
  let pomoIsRunning = false;

  // Calendar State
  let currentCalDate = new Date();
  
  // Audio Context for Pomodoro
  let audioCtx;

  // Toast Function
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    
    const iconClass = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    const iconColor = type === 'error' ? 'var(--danger-color)' : 'var(--accent-color)';
    
    toast.innerHTML = `
      <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 3000);
  }

  function playBeep() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
    oscillator.stop(audioCtx.currentTime + 0.5);
  }

  function notifyUser(msg) {
    playBeep();
    showToast(msg);
    if (Notification.permission === "granted") {
      new Notification("Learning Journal", { body: msg });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("Learning Journal", { body: msg });
        }
      });
    }
  }
  
  // Initialize
  init();

  function init() {
    setupNavigation();
    setupDataBinding();
    setupClearButtons();
    setupPrintButton();
    setupProcrastinationAlert();
    setupPomodoro();
    setupHistoryAndStreak();
    setupCalendar();
    populateFormFromData();
    updateSummaries();
  }

  // Navigation Logic
  function setupNavigation() {
    // Mobile menu toggle
    mobileMenuOpen.addEventListener('click', () => {
      sidebar.classList.add('open');
    });

    mobileMenuClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });

    // Tab switching
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove active class from all items and sections
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));

        // Add active class to clicked item and corresponding section
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Close mobile menu on select
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
        }
      });
    });

    // Home Dashboard specific navigation
    if (btnAddReport) {
      btnAddReport.addEventListener('click', () => {
        document.querySelector('.nav-item[data-target="daily-report"]').click();
      });
    }

    // UX Save buttons
    const setupUxSave = (btn, msg) => {
      if(btn) {
        btn.addEventListener('click', () => {
          showToast(msg);
          document.querySelector('.nav-item[data-target="home-dashboard"]').click();
        });
      }
    };

    setupUxSave(btnSaveGoal, 'Learning Goal saved successfully!');
    setupUxSave(btnSaveContract, 'Weekly Contract saved successfully!');
    setupUxSave(btnSavePlan, 'Tomorrow Plan saved successfully!');
    setupUxSave(btnSaveChunk, 'Chunk of the Day saved successfully!');
    setupUxSave(btnSaveProcrastination, 'Anti-Procrastination plan saved successfully!');

    // Home Dashboard Add/Edit buttons
    if (btnAddGoal) btnAddGoal.addEventListener('click', () => document.querySelector('.nav-item[data-target="learning-goal"]').click());
    if (btnEditGoal) btnEditGoal.addEventListener('click', () => document.querySelector('.nav-item[data-target="learning-goal"]').click());
    if (btnAddFocus) btnAddFocus.addEventListener('click', () => document.querySelector('.nav-item[data-target="weekly-contract"]').click());
    if (btnEditFocus) btnEditFocus.addEventListener('click', () => document.querySelector('.nav-item[data-target="weekly-contract"]').click());
    if (btnAddChunk) btnAddChunk.addEventListener('click', () => document.querySelector('.nav-item[data-target="chunk-of-day"]').click());
    if (btnEditChunk) btnEditChunk.addEventListener('click', () => document.querySelector('.nav-item[data-target="chunk-of-day"]').click());
  }

  // Data Binding and Storage
  function setupDataBinding() {
    dataElements.forEach(el => {
      el.addEventListener('input', (e) => {
        const path = e.target.getAttribute('data-model').split('.');
        let current = journalData;
        
        // Traverse path to set value
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        
        const lastKey = path[path.length - 1];
        
        if (e.target.type === 'checkbox') {
          current[lastKey] = e.target.checked;
        } else if (e.target.type === 'radio') {
          if (e.target.checked) {
            current[lastKey] = e.target.value;
          }
        } else {
          current[lastKey] = e.target.value;
        }

        saveData();
        
        // If key sections changed, update summaries
        if (path[0] === 'learningGoal' && path[1] === 'what') updateSummaries();
        if (path[0] === 'weeklyContract' && path[1] === 'focus') updateSummaries();
        if (path[0] === 'chunkOfDay' && path[1] === 'chunk') updateSummaries();
      });
    });
  }

  function updateSummaries() {
    const hasGoal = journalData.learningGoal && journalData.learningGoal.what;
    if (summaryGoal) {
      if (hasGoal) {
        summaryGoal.textContent = journalData.learningGoal.what;
        summaryGoal.classList.remove('hidden');
        if(btnAddGoal) btnAddGoal.classList.add('hidden');
        if(btnEditGoal) btnEditGoal.classList.remove('hidden');
      } else {
        summaryGoal.classList.add('hidden');
        if(btnAddGoal) btnAddGoal.classList.remove('hidden');
        if(btnEditGoal) btnEditGoal.classList.add('hidden');
      }
    }

    const hasFocus = journalData.weeklyContract && journalData.weeklyContract.focus;
    if (summaryFocus) {
      if (hasFocus) {
        summaryFocus.textContent = journalData.weeklyContract.focus;
        summaryFocus.classList.remove('hidden');
        if(btnAddFocus) btnAddFocus.classList.add('hidden');
        if(btnEditFocus) btnEditFocus.classList.remove('hidden');
      } else {
        summaryFocus.classList.add('hidden');
        if(btnAddFocus) btnAddFocus.classList.remove('hidden');
        if(btnEditFocus) btnEditFocus.classList.add('hidden');
      }
    }

    // Today's Chunk
    const hasChunk = journalData.chunkOfDay && journalData.chunkOfDay.chunk;
    if (summaryChunk) {
      if (hasChunk) {
        summaryChunk.textContent = journalData.chunkOfDay.chunk;
        summaryChunk.classList.remove('hidden');
        if(btnAddChunk) btnAddChunk.classList.add('hidden');
        if(btnEditChunk) btnEditChunk.classList.remove('hidden');
      } else {
        summaryChunk.classList.add('hidden');
        if(btnAddChunk) btnAddChunk.classList.remove('hidden');
        if(btnEditChunk) btnEditChunk.classList.add('hidden');
      }
    }

    // Today's Plan (From Yesterday's Tomorrow Plan)
    if (summaryPlan) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yYear = yesterday.getFullYear();
      const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yDay = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
      
      let foundPlan = null;
      if (journalData.dailyReportsHistory) {
        const yesterdaySnapshot = journalData.dailyReportsHistory.find(r => r.date === yesterdayStr);
        if (yesterdaySnapshot && yesterdaySnapshot.tomorrowPlan) {
          foundPlan = yesterdaySnapshot.tomorrowPlan;
        }
      }

      if (foundPlan && (foundPlan.firstTask || foundPlan.task1 || foundPlan.task2 || foundPlan.task3)) {
        let html = '<ul style="list-style: none; padding: 0; margin: 0; display:flex; flex-direction:column; gap:4px; color:var(--text-main);">';
        if (foundPlan.firstTask) html += `<li><input type="checkbox"> <strong>[First Task]</strong> ${foundPlan.firstTask}</li>`;
        if (foundPlan.task1) html += `<li><input type="checkbox"> ${foundPlan.task1}</li>`;
        if (foundPlan.task2) html += `<li><input type="checkbox"> ${foundPlan.task2}</li>`;
        if (foundPlan.task3) html += `<li><input type="checkbox"> ${foundPlan.task3}</li>`;
        html += '</ul>';
        summaryPlan.innerHTML = html;
        summaryPlan.classList.remove('text-muted');
      } else {
        summaryPlan.innerHTML = 'No plan was written yesterday.';
        summaryPlan.classList.add('text-muted');
      }
    }
  }

  function populateFormFromData() {
    dataElements.forEach(el => {
      const path = el.getAttribute('data-model').split('.');
      let current = journalData;
      let val = undefined;
      
      for (let i = 0; i < path.length; i++) {
        if (current[path[i]] !== undefined) {
          current = current[path[i]];
          if (i === path.length - 1) val = current;
        } else {
          break;
        }
      }

      if (val !== undefined) {
        if (el.type === 'checkbox') {
          el.checked = val;
        } else if (el.type === 'radio') {
          el.checked = (el.value === val);
        } else {
          el.value = val;
        }
      }
    });

    // Trigger specific UI updates based on loaded data
    checkProcrastinationStatus();
  }

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journalData));
  }

  // Clear functionality
  function setupClearButtons() {
    btnClearAll.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all journal data? This cannot be undone.')) {
        journalData = {};
        saveData();
        clearAllFormInputs();
        checkProcrastinationStatus();
      }
    });

    btnClearSections.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sectionKey = e.target.getAttribute('data-section');
        if (confirm('Are you sure you want to clear this section?')) {
          journalData[sectionKey] = {};
          saveData();
          
          // Re-populate form to clear just this section
          clearAllFormInputs();
          populateFormFromData();
          checkProcrastinationStatus();
          updateSummaries();
        }
      });
    });
  }

  function clearAllFormInputs() {
    dataElements.forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });
  }

  // Print
  function setupPrintButton() {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // UI specific logic
  function setupProcrastinationAlert() {
    procrastinationRadios.forEach(radio => {
      radio.addEventListener('change', checkProcrastinationStatus);
    });
  }

  function checkProcrastinationStatus() {
    let show = false;
    procrastinationRadios.forEach(radio => {
      if (radio.checked && radio.value === 'yes') {
        show = true;
      }
    });
    
    if (show) {
      procrastinationAlert.classList.remove('hidden');
    } else {
      procrastinationAlert.classList.add('hidden');
    }
  }

  // Pomodoro Logic
  function setupPomodoro() {
    btnPomoStart.addEventListener('click', () => {
      if (!pomoIsRunning) {
        // Request notification permission on first start
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
        
        pomoIsRunning = true;
        btnPomoStart.classList.add('hidden');
        btnPomoPause.classList.remove('hidden');
        pomoTimer = setInterval(updatePomodoro, 1000);
      }
    });

    btnPomoPause.addEventListener('click', () => {
      if (pomoIsRunning) {
        pomoIsRunning = false;
        btnPomoPause.classList.add('hidden');
        btnPomoStart.classList.remove('hidden');
        clearInterval(pomoTimer);
      }
    });

    btnPomoReset.addEventListener('click', () => {
      pomoIsRunning = false;
      clearInterval(pomoTimer);
      btnPomoPause.classList.add('hidden');
      btnPomoStart.classList.remove('hidden');
      pomoIsFocus = true;
      pomoTimeLeft = 25 * 60;
      updatePomodoroDisplay();
      pomoMode.textContent = 'Focus Mode';
    });
  }

  function updatePomodoro() {
    if (pomoTimeLeft > 0) {
      pomoTimeLeft--;
      updatePomodoroDisplay();
    } else {
      // Switch mode
      pomoIsFocus = !pomoIsFocus;
      pomoTimeLeft = pomoIsFocus ? 25 * 60 : 5 * 60;
      pomoMode.textContent = pomoIsFocus ? 'Focus Mode' : 'Break Time';
      updatePomodoroDisplay();
      notifyUser(pomoIsFocus ? 'Time to focus!' : 'Time for a break!');
    }
  }

  function updatePomodoroDisplay() {
    const minutes = Math.floor(pomoTimeLeft / 60);
    const seconds = pomoTimeLeft % 60;
    pomoTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // History and Streak Logic
  function setupHistoryAndStreak() {
    btnSaveReport.addEventListener('click', () => {
      const dateVal = document.getElementById('dr-date').value;
      const topicVal = document.getElementById('dr-topic').value;

      if (!dateVal) {
        showToast('Please enter a date before saving the report.', 'error');
        return;
      }

      // Ensure history array exists
      if (!journalData.dailyReportsHistory) {
        journalData.dailyReportsHistory = [];
      }

      // Create snapshot of all daily activities
      const reportSnapshot = { 
        date: dateVal,
        dailyReport: { ...journalData.dailyReport },
        tomorrowPlan: { ...journalData.tomorrowPlan },
        chunkOfDay: { ...journalData.chunkOfDay },
        antiProcrastination: { ...journalData.antiProcrastination }
      };
      
      // Check if report for this date already exists and replace it, or push new
      const existingIndex = journalData.dailyReportsHistory.findIndex(r => r.date === dateVal);
      if (existingIndex >= 0) {
        if(confirm('A Daily Snapshot for this date already exists. Overwrite?')) {
          journalData.dailyReportsHistory[existingIndex] = reportSnapshot;
        } else {
          return;
        }
      } else {
        journalData.dailyReportsHistory.push(reportSnapshot);
      }

      // Clear current forms so user starts fresh tomorrow
      journalData.dailyReport = {};
      journalData.tomorrowPlan = {};
      journalData.chunkOfDay = {};
      journalData.antiProcrastination = {};
      saveData();
      
      // Update UI
      clearSpecificSection('dailyReport');
      clearSpecificSection('tomorrowPlan');
      clearSpecificSection('chunkOfDay');
      clearSpecificSection('antiProcrastination');
      
      calculateStreak();
      renderCalendar(); // Re-render calendar to show new report
      
      showToast('Daily Snapshot saved!');
      document.querySelector('.nav-item[data-target="home-dashboard"]').click();
    });

    calculateStreak();
  }

  function clearSpecificSection(sectionKey) {
    dataElements.forEach(el => {
      const path = el.getAttribute('data-model');
      if (path.startsWith(sectionKey + '.')) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      }
    });
  }

  // Remove renderHistory completely, replaced by showSnapshot logic below.

  function calculateStreak() {
    if (!journalData.dailyReportsHistory || journalData.dailyReportsHistory.length === 0) {
      streakCounter.textContent = '0 Day Streak';
      return;
    }

    const dates = journalData.dailyReportsHistory
      .map(r => r.date)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a)); // Descending

    if (dates.length === 0) return;

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Get weekly study days. If not set, assume everyday is a study day.
    const studyDays = journalData.weeklyContract?.days || {};
    const noDaysSelected = Object.keys(studyDays).length === 0 || !Object.values(studyDays).includes(true);
    
    const requiredDaysMap = {
      1: noDaysSelected || studyDays.mon,
      2: noDaysSelected || studyDays.tue,
      3: noDaysSelected || studyDays.wed,
      4: noDaysSelected || studyDays.thu,
      5: noDaysSelected || studyDays.fri,
      6: noDaysSelected || studyDays.sat,
      0: noDaysSelected || studyDays.sun
    };

    let currDate = new Date(today);
    
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    // Check if we already have a report for today
    if (dates.includes(formatDate(currDate))) {
        streak++;
    }
    
    currDate.setDate(currDate.getDate() - 1); // Move to yesterday

    while(true) {
        const dateStr = formatDate(currDate);
        if (dates.includes(dateStr)) {
            streak++;
            currDate.setDate(currDate.getDate() - 1);
        } else {
            // No report on this day
            if (requiredDaysMap[currDate.getDay()]) {
                // It was a required day and we missed it! Streak broken.
                break;
            } else {
                // Not a required day, we can skip it and streak continues.
                currDate.setDate(currDate.getDate() - 1);
            }
        }
        
        // Safety break if we went too far back past the first recorded report
        if (new Date(dates[dates.length - 1]) > currDate) {
            break;
        }
    }

    streakCounter.textContent = `🔥 ${streak} Day Streak`;
  }

  // Calendar Logic
  function setupCalendar() {
    btnCalPrev.addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() - 1);
      renderCalendar();
    });

    btnCalNext.addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() + 1);
      renderCalendar();
    });

    renderCalendar();
  }

  function renderCalendar() {
    if (!calGrid || !calMonthYear) return;

    calGrid.innerHTML = '';
    
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth(); // 0-indexed
    
    // Set Header text
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    calMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Get day of week for 1st (0 = Sun, 1 = Mon, etc.)
    // We want Monday = 0, Sunday = 6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    // Set of dates that have reports
    const reportDates = new Set();
    if (journalData.dailyReportsHistory) {
      journalData.dailyReportsHistory.forEach(r => {
        if (r.date) reportDates.add(r.date);
      });
    }

    // Empty cells for preceding days
    for (let i = 0; i < startingDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty';
      calGrid.appendChild(emptyCell);
    }

    // Day cells
    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'cal-day';
      dayCell.textContent = i;

      // Check if this date has a report
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if (reportDates.has(dateStr)) {
        dayCell.classList.add('has-report');
        dayCell.title = "View Snapshot";
        dayCell.addEventListener('click', () => showSnapshot(dateStr));
      }

      calGrid.appendChild(dayCell);
    }
  }

  function showSnapshot(dateStr) {
    if (!snapshotViewer) return;

    const snapshot = journalData.dailyReportsHistory.find(r => r.date === dateStr);
    if (!snapshot) return;

    // Helper to safely get nested data
    const getSafe = (obj, key) => obj && obj[key] ? obj[key] : '<span class="text-muted">Not filled</span>';

    snapshotViewer.innerHTML = `
      <div class="snapshot-header">
        <span class="snapshot-date">${dateStr}</span>
        <button class="btn-icon" id="close-snapshot">&times;</button>
      </div>

      <div class="snapshot-section">
        <h4>Daily Report Topic</h4>
        <p><strong>Topic:</strong> ${getSafe(snapshot.dailyReport, 'topic')}</p>
        <p><strong>Focus Mode:</strong> ${getSafe(snapshot.dailyReport, 'focus')}</p>
        <p><strong>Recall Ideas:</strong> 
          ${snapshot.dailyReport && snapshot.dailyReport.recall1 ? snapshot.dailyReport.recall1 : ''} 
          ${snapshot.dailyReport && snapshot.dailyReport.recall2 ? ', ' + snapshot.dailyReport.recall2 : ''} 
          ${snapshot.dailyReport && snapshot.dailyReport.recall3 ? ', ' + snapshot.dailyReport.recall3 : ''}
          ${(!snapshot.dailyReport || (!snapshot.dailyReport.recall1 && !snapshot.dailyReport.recall2 && !snapshot.dailyReport.recall3)) ? '<span class="text-muted">None</span>' : ''}
        </p>
      </div>

      <div class="snapshot-section">
        <h4>Chunk of the Day</h4>
        <p><strong>Chunk:</strong> ${getSafe(snapshot.chunkOfDay, 'chunk')}</p>
        <p><strong>Explanation:</strong> ${getSafe(snapshot.chunkOfDay, 'explain')}</p>
      </div>

      <div class="snapshot-section">
        <h4>Tomorrow Plan</h4>
        <p><strong>First Task:</strong> ${getSafe(snapshot.tomorrowPlan, 'firstTask')}</p>
        <p><strong>Task 1:</strong> ${getSafe(snapshot.tomorrowPlan, 'task1')}</p>
      </div>
    `;

    snapshotViewer.classList.remove('hidden');
    
    // Add close listener
    document.getElementById('close-snapshot').addEventListener('click', () => {
      snapshotViewer.classList.add('hidden');
    });
    
    // Smooth scroll to it
    snapshotViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
