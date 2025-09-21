// Theme handling
const themeRadios = document.querySelectorAll('input[name="theme"]');
const body = document.body;

// Get saved theme or default to system
const savedTheme = localStorage.getItem('theme') || 'system';
document.getElementById(`theme-${savedTheme}`).checked = true;
body.setAttribute('data-theme', savedTheme);

themeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const theme = e.target.value;
    body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });
});

// Filter functionality (basic example)
const historyItems = document.querySelectorAll('.history-item');

function filterItems() {

  historyItems.forEach(item => {
    let show = true;

    item.style.display = show ? 'block' : 'none';
  });
}


// Show empty state if no visible items
function checkEmptyState() {
  const visibleItems = Array.from(historyItems).filter(item =>
    item.style.display !== 'none'
  );
  const emptyState = document.querySelector('.empty-state');
  const historyList = document.querySelector('.history-list');

  if (visibleItems.length === 0) {
    historyList.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    historyList.style.display = 'flex';
    emptyState.style.display = 'none';
  }
}

// Navigation functions
function showProfileView() {
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('profile-view').style.display = 'flex';
}

function showMainView() {
  document.getElementById('profile-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'flex';
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  checkEmptyState();
  
  // Add navigation event listeners
  const userInfoBtn = document.getElementById('user-info-btn');
  const backBtn = document.getElementById('back-btn');
  
  if (userInfoBtn) {
    userInfoBtn.addEventListener('click', showProfileView);
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', showMainView);
  }
});

function toggleSources(event) {
  const header = event.currentTarget;
  const sourcesId = header.getAttribute('aria-controls');
  const sources = document.getElementById(sourcesId);
  const expanded = header.getAttribute('aria-expanded') === 'true';
  header.setAttribute('aria-expanded', String(!expanded));
  if (sources) {
    sources.hidden = expanded;
  }
}