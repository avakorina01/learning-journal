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
  
  const streakCounter = document.getElementById('home-streak-counter');
  
  // Dashboard Summaries
  const summaryGoal = document.getElementById('summary-goal');
  const summaryFocus = document.getElementById('summary-focus');
  const summaryPlan = document.getElementById('summary-plan');
  const summaryChunk = document.getElementById('summary-chunk');
  
  // Modals
  const modals = document.querySelectorAll('.modal-overlay');
  const btnOpenModals = document.querySelectorAll('.btn-edit-modal');
  const btnCloseModals = document.querySelectorAll('.btn-close-modal, .btn-close-modal-footer');
  const btnOpenWizard = document.getElementById('btn-open-wizard');
  const modalWizard = document.getElementById('modal-wizard');
  const modalGoal = document.getElementById('modal-goal');
  
  // Goals Elements
  const btnAddNewGoal = document.getElementById('btn-add-new-goal');
  const goalsListContainer = document.getElementById('goals-list-container');
  
  // Wizard Logic
  let currentWizardStep = 1;
  const totalWizardSteps = 3;
  const btnWizPrev = document.getElementById('btn-wiz-prev');
  const btnWizNext = document.getElementById('btn-wiz-next');
  const btnSaveReport = document.getElementById('btn-save-report');
  const wizSteps = document.querySelectorAll('.wizard-step');
  const wizIndicators = document.querySelectorAll('.step-indicator');
  const wizProgressBar = document.getElementById('wizard-progress-fill');
  
  // Modal Save Buttons
  const btnSaveGoal = document.getElementById('btn-save-goal');
  const btnSaveContract = document.getElementById('btn-save-contract');
  const btnSaveProcrastination = document.getElementById('btn-save-procrastination');
  
  // Calendar Elements
  const calMonthYear = document.getElementById('cal-month-year');
  const calGrid = document.getElementById('calendar-grid');
  const btnCalPrev = document.getElementById('cal-prev');
  const btnCalNext = document.getElementById('cal-next');
  const snapshotViewer = document.getElementById('snapshot-viewer');

  // Pomodoro Elements
  const pomoTime = document.getElementById('pomodoro-time');
  const pomoMode = document.getElementById('pomodoro-mode');
  const btnPomoStart = document.getElementById('pomo-start');
  const btnPomoPause = document.getElementById('pomo-pause');
  const btnPomoReset = document.getElementById('pomo-reset');
  
  // Data model binding elements
  const dataElements = document.querySelectorAll('[data-model]');

  // Storage Key
  const STORAGE_KEY = 'learningJournalData';

  // State
  let journalData = loadData();

  // Pomodoro State
  let pomoTimer = null;
  let pomoTimeLeft = 25 * 60;
  let pomoIsFocus = true;
  let pomoIsRunning = false;
  let audioCtx;

  // Calendar State
  let currentCalDate = new Date();
  
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
    migrateGoalsData();
    setupNavigation();
    setupModals();
    setupGoalsManager();
    setupWizard();
    setupDataBinding();
    setupClearButtons();
    setupPrintButton();
    setupPomodoro();
    setupHistoryAndStreak();
    setupCalendar();
    populateFormFromData();
    renderGoalsList();
    updateSummaries();
    setupTodaysPlan();
  }
  
  function migrateGoalsData() {
    if (!journalData.goals) {
      journalData.goals = [];
    }
    
    if (journalData.learningGoal && journalData.learningGoal.what) {
      const newGoal = {
        id: Date.now().toString(),
        what: journalData.learningGoal.what || '',
        why: journalData.learningGoal.why || '',
        how: journalData.learningGoal.how || '',
        smallestStep: journalData.learningGoal.smallestStep || '',
        status: 'active'
      };
      journalData.goals.push(newGoal);
      journalData.activeGoalId = newGoal.id;
      delete journalData.learningGoal;
      saveData();
    }
  }

  // Navigation Logic
  function setupNavigation() {
    mobileMenuOpen.addEventListener('click', () => {
      sidebar.classList.add('open');
    });

    mobileMenuClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
        }
      });
    });
  }

  // Modals Logic
  function setupModals() {
    // Open Contract Modal from Dashboard
    document.querySelector('.btn-edit-modal[data-modal="modal-contract"]').addEventListener('click', () => {
      document.getElementById('modal-contract').classList.remove('hidden');
    });

    btnCloseModals.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.add('hidden');
      });
    });

    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    if(btnSaveContract) {
      btnSaveContract.addEventListener('click', () => {
        showToast('Weekly Contract saved successfully!');
        document.getElementById('modal-contract').classList.add('hidden');
        updateSummaries();
      });
    }

    if(btnSaveProcrastination) {
      btnSaveProcrastination.addEventListener('click', () => {
        showToast('Anti-Procrastination plan saved!');
      });
    }
  }
  
  // Goals Manager Logic
  function setupGoalsManager() {
    // Edit active goal from Dashboard
    const btnEditCurrentGoal = document.querySelector('.btn-edit-modal[data-modal="modal-goal"]');
    if (btnEditCurrentGoal) {
      btnEditCurrentGoal.addEventListener('click', () => {
        const activeGoal = getActiveGoal();
        openGoalModal(activeGoal);
      });
    }
    
    // Add New Goal from My Goals page
    if (btnAddNewGoal) {
      btnAddNewGoal.addEventListener('click', () => {
        openGoalModal(null); // empty form
      });
    }
    
    // Save Goal Logic
    if (btnSaveGoal) {
      btnSaveGoal.addEventListener('click', () => {
        const idField = document.getElementById('lg-id');
        const whatField = document.getElementById('lg-what');
        const whyField = document.getElementById('lg-why');
        const howField = document.getElementById('lg-how');
        const stepField = document.getElementById('lg-smallest-step');
        
        if (!whatField.value.trim()) {
          showToast('Goal title (What) cannot be empty.', 'error');
          return;
        }
        
        const goalData = {
          what: whatField.value,
          why: whyField.value,
          how: howField.value,
          smallestStep: stepField.value,
        };
        
        if (idField.value) {
          // Update existing
          const goal = journalData.goals.find(g => g.id === idField.value);
          if (goal) {
            Object.assign(goal, goalData);
          }
        } else {
          // Create new
          goalData.id = Date.now().toString();
          goalData.status = 'active'; // Default new goal to active
          journalData.goals.push(goalData);
          journalData.activeGoalId = goalData.id; // Automatically make it active
        }
        
        saveData();
        showToast('Goal saved successfully!');
        modalGoal.classList.add('hidden');
        renderGoalsList();
        updateSummaries();
      });
    }
  }
  
  function getActiveGoal() {
    if (!journalData.goals) return null;
    return journalData.goals.find(g => g.id === journalData.activeGoalId) || null;
  }
  
  function openGoalModal(goal) {
    const idField = document.getElementById('lg-id');
    const whatField = document.getElementById('lg-what');
    const whyField = document.getElementById('lg-why');
    const howField = document.getElementById('lg-how');
    const stepField = document.getElementById('lg-smallest-step');
    
    if (goal) {
      idField.value = goal.id;
      whatField.value = goal.what || '';
      whyField.value = goal.why || '';
      howField.value = goal.how || '';
      stepField.value = goal.smallestStep || '';
    } else {
      idField.value = '';
      whatField.value = '';
      whyField.value = '';
      howField.value = '';
      stepField.value = '';
    }
    
    modalGoal.classList.remove('hidden');
  }

  function renderGoalsList() {
    if (!goalsListContainer) return;
    goalsListContainer.innerHTML = '';
    
    if (!journalData.goals || journalData.goals.length === 0) {
      goalsListContainer.innerHTML = '<p class="text-muted text-empty">You have no goals yet. Start by creating one!</p>';
      return;
    }
    
    // Sort so active goal is on top, then newer ones
    const sortedGoals = [...journalData.goals].sort((a, b) => {
      if (a.id === journalData.activeGoalId) return -1;
      if (b.id === journalData.activeGoalId) return 1;
      return b.id.localeCompare(a.id); // roughly sort by date desc
    });
    
    sortedGoals.forEach(goal => {
      const isActive = (goal.id === journalData.activeGoalId && goal.status === 'active');
      const isCompleted = (goal.status === 'completed');
      
      const card = document.createElement('div');
      card.className = `goal-card ${isActive ? 'active-goal' : (isCompleted ? 'completed-goal' : '')}`;
      
      card.innerHTML = `
        <div class="goal-header">
          <div class="goal-title">${goal.what}</div>
          ${isActive ? '<span class="goal-status-badge badge-active"><i class="fa-solid fa-star"></i> Active</span>' : ''}
          ${isCompleted ? '<span class="goal-status-badge badge-completed"><i class="fa-solid fa-check"></i> Completed</span>' : ''}
        </div>
        <div class="goal-details">
          ${goal.why ? `<p><strong>Why:</strong> ${goal.why}</p>` : ''}
          ${goal.how ? `<p><strong>How I'll know I've improved:</strong> ${goal.how}</p>` : ''}
          ${goal.smallestStep ? `<p><strong>Smallest step:</strong> ${goal.smallestStep}</p>` : ''}
        </div>
        <div class="goal-actions">
          <button class="btn btn-secondary btn-sm action-edit" data-id="${goal.id}"><i class="fa-solid fa-pen"></i> Edit</button>
          ${isActive ? `<button class="btn btn-success btn-sm action-complete" data-id="${goal.id}"><i class="fa-solid fa-check-double"></i> Complete</button>` : ''}
          ${!isActive ? `<button class="btn btn-primary btn-sm action-set-active" data-id="${goal.id}">Set as Active</button>` : ''}
          <button class="btn btn-danger btn-sm action-delete" data-id="${goal.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      
      goalsListContainer.appendChild(card);
    });
    
    // Attach event listeners for dynamic buttons
    document.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = journalData.goals.find(g => g.id === id);
        if (goal) openGoalModal(goal);
      });
    });
    
    document.querySelectorAll('.action-complete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = journalData.goals.find(g => g.id === id);
        if (goal) {
          goal.status = 'completed';
          if (journalData.activeGoalId === id) journalData.activeGoalId = null;
          saveData();
          renderGoalsList();
          updateSummaries();
          showToast('Amazing! Goal marked as completed!', 'success');
        }
      });
    });
    
    document.querySelectorAll('.action-set-active').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = journalData.goals.find(g => g.id === id);
        if (goal) {
          goal.status = 'active';
          journalData.activeGoalId = id;
          saveData();
          renderGoalsList();
          updateSummaries();
          showToast('Goal set as active.');
        }
      });
    });
    
    document.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Are you sure you want to delete this goal?')) {
          const id = e.currentTarget.getAttribute('data-id');
          journalData.goals = journalData.goals.filter(g => g.id !== id);
          if (journalData.activeGoalId === id) journalData.activeGoalId = null;
          saveData();
          renderGoalsList();
          updateSummaries();
        }
      });
    });
  }

  // Wizard Logic
  function setupWizard() {
    if (!btnOpenWizard) return;
    
    btnOpenWizard.addEventListener('click', () => {
      currentWizardStep = 1;
      updateWizardUI();
      modalWizard.classList.remove('hidden');
    });

    btnWizNext.addEventListener('click', () => {
      if (currentWizardStep < totalWizardSteps) {
        currentWizardStep++;
        updateWizardUI();
      }
    });

    btnWizPrev.addEventListener('click', () => {
      if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
      }
    });

    btnSaveReport.addEventListener('click', () => {
      const dateVal = document.getElementById('dr-date').value;
      if (!dateVal) {
        showToast('Please enter a date before saving the report.', 'error');
        return;
      }

      if (!journalData.dailyReportsHistory) {
        journalData.dailyReportsHistory = [];
      }

      const reportSnapshot = { 
        date: dateVal,
        dailyReport: { ...journalData.dailyReport },
        tomorrowPlan: { ...journalData.tomorrowPlan },
        chunkOfDay: { ...journalData.chunkOfDay },
        antiProcrastination: { ...journalData.antiProcrastination }
      };
      
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

      // Clear wizard forms
      journalData.dailyReport = {};
      journalData.tomorrowPlan = {};
      journalData.chunkOfDay = {};
      saveData();
      clearSpecificSection('dailyReport');
      clearSpecificSection('tomorrowPlan');
      clearSpecificSection('chunkOfDay');
      
      calculateStreak();
      renderCalendar();
      updateSummaries();
      
      showToast('Daily Snapshot saved! Great job!');
      modalWizard.classList.add('hidden');
    });
  }

  function updateWizardUI() {
    // Update steps
    wizSteps.forEach((step, index) => {
      if (index + 1 === currentWizardStep) {
        step.classList.add('active');
        step.classList.remove('hidden');
      } else {
        step.classList.remove('active');
        step.classList.add('hidden');
      }
    });

    // Update indicators
    wizIndicators.forEach((ind, index) => {
      if (index + 1 === currentWizardStep) {
        ind.classList.add('active');
      } else {
        ind.classList.remove('active');
      }
    });

    // Update progress bar
    wizProgressBar.style.width = `${(currentWizardStep / totalWizardSteps) * 100}%`;

    // Update buttons
    if (currentWizardStep === 1) {
      btnWizPrev.classList.add('hidden');
    } else {
      btnWizPrev.classList.remove('hidden');
    }

    if (currentWizardStep === totalWizardSteps) {
      btnWizNext.classList.add('hidden');
      btnSaveReport.classList.remove('hidden');
    } else {
      btnWizNext.classList.remove('hidden');
      btnSaveReport.classList.add('hidden');
    }
  }

  // Data Binding and Storage
  function setupDataBinding() {
    dataElements.forEach(el => {
      el.addEventListener('input', (e) => {
        const path = e.target.getAttribute('data-model').split('.');
        let current = journalData;
        
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

  function updateSummaries() {
    const activeGoal = getActiveGoal();
    if (summaryGoal) {
      if (activeGoal && activeGoal.what) {
        summaryGoal.textContent = activeGoal.what;
        summaryGoal.classList.remove('text-empty');
      } else {
        summaryGoal.textContent = 'No active goal set. Go to My Goals to select or create one.';
        summaryGoal.classList.add('text-empty');
      }
    }

    const hasFocus = journalData.weeklyContract && journalData.weeklyContract.focus;
    if (summaryFocus) {
      if (hasFocus) {
        summaryFocus.textContent = journalData.weeklyContract.focus;
        summaryFocus.classList.remove('text-empty');
      } else {
        summaryFocus.textContent = 'No focus set for this week. Click to plan your study sessions.';
        summaryFocus.classList.add('text-empty');
      }
    }

    const hasChunk = journalData.chunkOfDay && journalData.chunkOfDay.chunk;
    if (summaryChunk) {
      if (hasChunk) {
        summaryChunk.textContent = journalData.chunkOfDay.chunk;
        summaryChunk.classList.remove('text-empty');
      } else {
        summaryChunk.textContent = 'No chunk defined for today yet. It will appear here after your Daily Report.';
        summaryChunk.classList.add('text-empty');
      }
    }
  }

  // Today's Plan Logic
  function setupTodaysPlan() {
    const listContainer = document.getElementById('todays-plan-list');
    const inputTask = document.getElementById('new-task-input');
    const btnAddTask = document.getElementById('btn-add-task');
    
    if (!listContainer) return;

    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;

    if (!journalData.todaysPlan) {
      journalData.todaysPlan = { date: '', tasks: [] };
    }

    if (journalData.todaysPlan.date !== todayStr) {
      // New day! Let's pull from yesterday's snapshot if available
      journalData.todaysPlan = { date: todayStr, tasks: [] };

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

      if (foundPlan) {
        if (foundPlan.firstTask) journalData.todaysPlan.tasks.push({ id: Date.now() + 1, text: '[First Task] ' + foundPlan.firstTask, done: false });
        if (foundPlan.task1) journalData.todaysPlan.tasks.push({ id: Date.now() + 2, text: foundPlan.task1, done: false });
        if (foundPlan.task2) journalData.todaysPlan.tasks.push({ id: Date.now() + 3, text: foundPlan.task2, done: false });
        if (foundPlan.task3) journalData.todaysPlan.tasks.push({ id: Date.now() + 4, text: foundPlan.task3, done: false });
      }
      saveData();
    }

    renderTodaysPlan();

    btnAddTask.addEventListener('click', () => {
      const text = inputTask.value.trim();
      if (text) {
        journalData.todaysPlan.tasks.push({ id: Date.now(), text, done: false });
        saveData();
        inputTask.value = '';
        renderTodaysPlan();
      }
    });

    inputTask.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnAddTask.click();
      }
    });
  }

  function renderTodaysPlan() {
    const listContainer = document.getElementById('todays-plan-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (journalData.todaysPlan.tasks.length === 0) {
      listContainer.innerHTML = '<li class="text-muted text-empty" style="padding:8px 0;">No tasks for today. Add one above!</li>';
      return;
    }

    journalData.todaysPlan.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
        <span class="todo-text ${task.done ? 'completed' : ''}">${task.text}</span>
        <button class="btn-delete-task" data-id="${task.id}"><i class="fa-solid fa-xmark"></i></button>
      `;

      listContainer.appendChild(li);
    });

    // Attach events
    document.querySelectorAll('.task-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        const task = journalData.todaysPlan.tasks.find(t => t.id === id);
        if (task) {
          task.done = e.target.checked;
          saveData();
          renderTodaysPlan();
        }
      });
    });

    document.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Are you sure you want to delete this task?')) {
          const id = parseInt(e.currentTarget.getAttribute('data-id'));
          journalData.todaysPlan.tasks = journalData.todaysPlan.tasks.filter(t => t.id !== id);
          saveData();
          renderTodaysPlan();
        }
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
        updateSummaries();
        calculateStreak();
        renderCalendar();
        renderGoalsList();
      }
    });

    btnClearSections.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sectionKey = e.target.getAttribute('data-section');
        if (confirm('Are you sure you want to clear this section?')) {
          journalData[sectionKey] = {};
          saveData();
          clearSpecificSection(sectionKey);
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

  // Print
  function setupPrintButton() {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Pomodoro Logic
  function setupPomodoro() {
    btnPomoStart.addEventListener('click', () => {
      if (!pomoIsRunning) {
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
    calculateStreak();
  }

  function calculateStreak() {
    if (!journalData.dailyReportsHistory || journalData.dailyReportsHistory.length === 0) {
      streakCounter.innerHTML = `<i class="fa-solid fa-fire"></i> 0 Day Streak`;
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
    
    if (dates.includes(formatDate(currDate))) {
        streak++;
    }
    
    currDate.setDate(currDate.getDate() - 1);

    while(true) {
        const dateStr = formatDate(currDate);
        if (dates.includes(dateStr)) {
            streak++;
            currDate.setDate(currDate.getDate() - 1);
        } else {
            if (requiredDaysMap[currDate.getDay()]) {
                break;
            } else {
                currDate.setDate(currDate.getDate() - 1);
            }
        }
        
        if (new Date(dates[dates.length - 1]) > currDate) {
            break;
        }
    }

    streakCounter.innerHTML = `<i class="fa-solid fa-fire"></i> ${streak} Day Streak`;
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
    const month = currentCalDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    calMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    const reportDates = new Set();
    if (journalData.dailyReportsHistory) {
      journalData.dailyReportsHistory.forEach(r => {
        if (r.date) reportDates.add(r.date);
      });
    }

    for (let i = 0; i < startingDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty';
      calGrid.appendChild(emptyCell);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'cal-day';
      dayCell.textContent = i;

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
    
    document.getElementById('close-snapshot').addEventListener('click', () => {
      snapshotViewer.classList.add('hidden');
    });
    
    snapshotViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
