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
  
  // Data model binding elements
  const dataElements = document.querySelectorAll('[data-model]');
  const procrastinationRadios = document.querySelectorAll('input[name="procrastination"]');
  const procrastinationAlert = document.getElementById('procrastination-alert');

  // Storage Key
  const STORAGE_KEY = 'learningJournalData';

  // State
  let journalData = loadData();

  // Initialize
  init();

  function init() {
    setupNavigation();
    setupDataBinding();
    setupClearButtons();
    setupPrintButton();
    setupProcrastinationAlert();
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
});
