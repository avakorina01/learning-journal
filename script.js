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
  const historyContainer = document.getElementById('history-container');
  const streakCounter = document.getElementById('streak-counter');
  
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
    populateFormFromData();
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
      });
    });
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
      // Optional: Play a sound here
      alert(pomoIsFocus ? 'Time to focus!' : 'Time for a break!');
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
        alert('Please enter a date before saving the report.');
        return;
      }

      // Ensure history array exists
      if (!journalData.dailyReportsHistory) {
        journalData.dailyReportsHistory = [];
      }

      // Create snapshot of current daily report
      const reportSnapshot = { ...journalData.dailyReport };
      
      // Check if report for this date already exists and replace it, or push new
      const existingIndex = journalData.dailyReportsHistory.findIndex(r => r.date === dateVal);
      if (existingIndex >= 0) {
        if(confirm('A report for this date already exists. Overwrite?')) {
          journalData.dailyReportsHistory[existingIndex] = reportSnapshot;
        } else {
          return;
        }
      } else {
        journalData.dailyReportsHistory.push(reportSnapshot);
      }

      // Clear current form
      journalData.dailyReport = {};
      saveData();
      
      // Update UI
      clearSpecificSection('dailyReport');
      renderHistory();
      calculateStreak();
      alert('Report saved to history!');
    });

    renderHistory();
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

  function renderHistory() {
    if (!journalData.dailyReportsHistory || journalData.dailyReportsHistory.length === 0) {
      historyContainer.innerHTML = '<p class="empty-state text-center text-muted">No past reports yet.</p>';
      return;
    }

    // Sort by date descending
    const sortedHistory = [...journalData.dailyReportsHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    historyContainer.innerHTML = '';
    sortedHistory.forEach(report => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const topicText = report.topic ? report.topic : 'No topic';
      const focusText = report.focus ? report.focus : '-';
      const recallText = [report.recall1, report.recall2, report.recall3].filter(Boolean).join(', ');

      el.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-date">${report.date}</span>
          <span class="history-item-topic">${topicText}</span>
        </div>
        <div class="history-item-content">
          <p><strong>Focus:</strong> ${focusText}</p>
          ${recallText ? `<p><strong>Recall:</strong> ${recallText}</p>` : ''}
        </div>
      `;
      historyContainer.appendChild(el);
    });
  }

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
    
    // Check if latest date is today or yesterday
    const latestDate = new Date(dates[0]);
    latestDate.setHours(0,0,0,0);
    
    const diffTime = Math.abs(today - latestDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      // Streak broken
      streak = 0;
    } else {
      streak = 1;
      // Count backwards
      for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i-1]);
        const d2 = new Date(dates[i]);
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        
        const diff = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
        } else if (diff > 1) {
          break; // Gap found
        }
      }
    }

    streakCounter.textContent = `${streak} Day Streak`;
  }
});
