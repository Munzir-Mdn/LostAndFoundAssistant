const CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL
  API_URL: '',
  STORAGE_KEY: 'lostFoundAssistantDemoData'
};

const state = {
  users: [],
  lostItems: [],
  foundItems: [],
  claims: [],
  currentUser: null
};

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadInitialData();
});

function bindEvents() {
  document.getElementById('openRegisterBtn').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));

  document.getElementById('heroLostBtn').addEventListener('click', () => openReportModal('lost'));
  document.getElementById('heroFoundBtn').addEventListener('click', () => openReportModal('found'));
  document.getElementById('quickLostBtn').addEventListener('click', () => openReportModal('lost'));
  document.getElementById('quickFoundBtn').addEventListener('click', () => openReportModal('found'));

  document.getElementById('seedBtn').addEventListener('click', seedDemoData);
  document.getElementById('refreshLostBtn').addEventListener('click', renderAll);
  document.getElementById('refreshFoundBtn').addEventListener('click', renderAll);
  document.getElementById('refreshClaimsBtn').addEventListener('click', renderAll);

  document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
  document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);
  document.getElementById('claimForm').addEventListener('submit', handleClaimSubmit);
  document.getElementById('searchForm').addEventListener('submit', handleSearchSubmit);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });
}

function loadInitialData() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (saved) {
    Object.assign(state, JSON.parse(saved));
    renderAll();
    return;
  }
  renderAll();
}

function persist() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function openAuthModal(mode) {
  document.getElementById('authMode').value = mode;
  document.getElementById('authTitle').textContent = mode === 'register' ? 'Register' : 'Login';
  document.getElementById('fullName').parentElement.style.display = mode === 'register' ? 'grid' : 'none';
  document.getElementById('phone').parentElement.style.display = mode === 'register' ? 'grid' : 'none';
  document.getElementById('authModal').classList.remove('hidden');
}

function openReportModal(type) {
  document.getElementById('reportType').value = type;
  document.getElementById('reportTitle').textContent = type === 'lost' ? 'Report Lost Item' : 'Report Found Item';
  document.getElementById('reportModal').classList.remove('hidden');
}

function openClaimModal(foundId) {
  document.getElementById('claimFoundId').value = foundId;
  document.getElementById('claimModal').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const mode = document.getElementById('authMode').value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (mode === 'register') {
    const user = {
      id: crypto.randomUUID(),
      fullName: document.getElementById('fullName').value.trim(),
      email,
      phone: document.getElementById('phone').value.trim(),
      password,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
    state.currentUser = user;
    showToast('Registration successful');
  } else {
    const user = state.users.find(u => u.email === email && u.password === password);
    if (!user) {
      showToast('Invalid email or password');
      return;
    }
    state.currentUser = user;
    showToast(`Welcome back, ${user.fullName}`);
  }

  persist();
  closeModal('authModal');
  document.getElementById('authForm').reset();
}

function handleReportSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    showToast('Please login first');
    return;
  }

  const type = document.getElementById('reportType').value;
  const item = {
    id: crypto.randomUUID(),
    userId: state.currentUser.id,
    itemName: document.getElementById('itemName').value.trim(),
    category: document.getElementById('category').value,
    location: document.getElementById('location').value.trim(),
    itemDate: document.getElementById('itemDate').value,
    imageUrl: document.getElementById('imageUrl').value.trim(),
    description: document.getElementById('description').value.trim(),
    status: 'Open',
    createdAt: new Date().toISOString()
  };

  if (type === 'lost') {
    state.lostItems.unshift(item);
    suggestMatchesForLost(item);
  } else {
    state.foundItems.unshift(item);
    suggestMatchesForFound(item);
  }

  persist();
  renderAll();
  closeModal('reportModal');
  document.getElementById('reportForm').reset();
  showToast(`${type === 'lost' ? 'Lost' : 'Found'} report added`);
}

function handleClaimSubmit(event) {
  event.preventDefault();
  if (!state.currentUser) {
    showToast('Please login first');
    return;
  }

  const foundId = document.getElementById('claimFoundId').value;
  const claim = {
    id: crypto.randomUUID(),
    foundId,
    claimantUserId: state.currentUser.id,
    claimantName: document.getElementById('claimantName').value.trim(),
    claimDetails: document.getElementById('claimDetails').value.trim(),
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  state.claims.unshift(claim);
  persist();
  renderAll();
  closeModal('claimModal');
  document.getElementById('claimForm').reset();
  showToast('Claim submitted successfully');
}

function handleSearchSubmit(event) {
  event.preventDefault();
  renderAll({
    keyword: document.getElementById('searchKeyword').value.trim().toLowerCase(),
    type: document.getElementById('searchType').value,
    category: document.getElementById('searchCategory').value
  });
}

function renderAll(filters = {}) {
  renderStats();
  renderItems('lost', filters);
  renderItems('found', filters);
  renderClaims();
}

function renderStats() {
  document.getElementById('lostCount').textContent = state.lostItems.length;
  document.getElementById('foundCount').textContent = state.foundItems.length;
  document.getElementById('claimCount').textContent = state.claims.length;
  document.getElementById('resolvedCount').textContent = state.claims.filter(c => c.status === 'Resolved').length;
}

function renderItems(type, filters = {}) {
  const listId = type === 'lost' ? 'lostList' : 'foundList';
  const container = document.getElementById(listId);

  let items = type === 'lost' ? [...state.lostItems] : [...state.foundItems];

  if (filters.keyword) {
    items = items.filter(item =>
      item.itemName.toLowerCase().includes(filters.keyword) ||
      item.description.toLowerCase().includes(filters.keyword)
    );
  }

  if (filters.category) {
    items = items.filter(item => item.category === filters.category);
  }

  if (filters.type && filters.type !== 'all' && filters.type !== type) {
    container.innerHTML = '<p class="empty">Filtered out by search type.</p>';
    return;
  }

  if (!items.length) {
    container.innerHTML = '<p class="empty">No reports available.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="item-card">
      <div class="section-header">
        <div>
          <strong>${escapeHtml(item.itemName)}</strong>
          <div class="item-meta">
            <span class="badge ${type === 'found' ? 'found' : ''}">${type.toUpperCase()}</span>
            <span>${escapeHtml(item.category)}</span>
            <span>${escapeHtml(item.location)}</span>
            <span>${escapeHtml(item.itemDate)}</span>
            <span>Status: ${escapeHtml(item.status)}</span>
          </div>
        </div>
      </div>
      <p>${escapeHtml(item.description)}</p>
      ${item.imageUrl ? `<a href="${item.imageUrl}" target="_blank" rel="noopener">View image</a>` : ''}
      <div class="item-actions">
        ${type === 'found' ? `<button class="btn" onclick="openClaimModal('${item.id}')">Claim This Item</button>` : ''}
        <button class="btn secondary" onclick="markResolved('${type}', '${item.id}')">Mark Resolved</button>
        <button class="btn danger" onclick="deleteItem('${type}', '${item.id}')">Delete</button>
      </div>
    </article>
  `).join('');
}

function renderClaims() {
  const container = document.getElementById('claimsList');
  if (!state.claims.length) {
    container.innerHTML = '<p class="empty">No claims submitted yet.</p>';
    return;
  }

  container.innerHTML = state.claims.map(claim => {
    const foundItem = state.foundItems.find(item => item.id === claim.foundId);
    return `
      <article class="item-card">
        <div class="section-header">
          <div>
            <strong>${escapeHtml(claim.claimantName)}</strong>
            <div class="item-meta">
              <span class="badge ${claim.status === 'Resolved' ? 'resolved' : 'claim'}">${escapeHtml(claim.status)}</span>
              <span>${escapeHtml(new Date(claim.createdAt).toLocaleString())}</span>
            </div>
          </div>
        </div>
        <p><strong>Claiming:</strong> ${escapeHtml(foundItem ? foundItem.itemName : 'Unknown item')}</p>
        <p><strong>Proof:</strong> ${escapeHtml(claim.claimDetails)}</p>
        <div class="item-actions">
          <button class="btn" onclick="updateClaimStatus('${claim.id}', 'Approved')">Approve</button>
          <button class="btn secondary" onclick="updateClaimStatus('${claim.id}', 'Rejected')">Reject</button>
          <button class="btn danger" onclick="updateClaimStatus('${claim.id}', 'Resolved')">Resolve</button>
        </div>
      </article>
    `;
  }).join('');
}

function deleteItem(type, id) {
  const key = type === 'lost' ? 'lostItems' : 'foundItems';
  state[key] = state[key].filter(item => item.id !== id);
  persist();
  renderAll();
  showToast('Report deleted');
}

function markResolved(type, id) {
  const key = type === 'lost' ? 'lostItems' : 'foundItems';
  const item = state[key].find(entry => entry.id === id);
  if (!item) return;
  item.status = 'Resolved';
  persist();
  renderAll();
  showToast('Status updated');
}

function updateClaimStatus(id, status) {
  const claim = state.claims.find(c => c.id === id);
  if (!claim) return;
  claim.status = status;
  persist();
  renderAll();
  showToast(`Claim marked as ${status}`);
}

function suggestMatchesForLost(lostItem) {
  const matches = state.foundItems.filter(found =>
    found.category === lostItem.category &&
    found.location.toLowerCase().includes(lostItem.location.toLowerCase())
  );
  if (matches.length) {
    showToast(`Possible match found for ${lostItem.itemName}`);
  }
}

function suggestMatchesForFound(foundItem) {
  const matches = state.lostItems.filter(lost =>
    lost.category === foundItem.category &&
    lost.location.toLowerCase().includes(foundItem.location.toLowerCase())
  );
  if (matches.length) {
    showToast(`Possible owner match found for ${foundItem.itemName}`);
  }
}

function seedDemoData() {
  const demoUser = {
    id: crypto.randomUUID(),
    fullName: 'Demo User',
    email: 'demo@example.com',
    phone: '0123456789',
    password: 'demo123',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  state.users = [demoUser];
  state.currentUser = demoUser;
  state.lostItems = [
    {
      id: crypto.randomUUID(),
      userId: demoUser.id,
      itemName: 'Black Wallet',
      category: 'Accessories',
      location: 'Library',
      itemDate: '2026-03-15',
      imageUrl: '',
      description: 'Black leather wallet with student card inside.',
      status: 'Open',
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      userId: demoUser.id,
      itemName: 'Calculator',
      category: 'Electronics',
      location: 'Block A',
      itemDate: '2026-03-14',
      imageUrl: '',
      description: 'Scientific calculator with white sticker at the back.',
      status: 'Open',
      createdAt: new Date().toISOString()
    }
  ];

  state.foundItems = [
    {
      id: crypto.randomUUID(),
      userId: demoUser.id,
      itemName: 'Set of Keys',
      category: 'Keys',
      location: 'Cafeteria',
      itemDate: '2026-03-16',
      imageUrl: '',
      description: 'Three keys with a blue keychain.',
      status: 'Open',
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      userId: demoUser.id,
      itemName: 'Student ID Card',
      category: 'Documents',
      location: 'Library',
      itemDate: '2026-03-16',
      imageUrl: '',
      description: 'Student card found near the printer area.',
      status: 'Open',
      createdAt: new Date().toISOString()
    }
  ];

  state.claims = [];
  persist();
  renderAll();
  showToast('Demo data loaded');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/*
  ============================
  OPTIONAL GOOGLE APPS SCRIPT API
  ============================
  Example usage:
  fetch(`${CONFIG.API_URL}?action=getLostItems`)
  fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'createLostItem', payload: item })
  })
*/
