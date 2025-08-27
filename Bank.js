 let currentUser = null;
const API_URL = 'http://localhost:3000';

let chartInstance = null;

// Show/hide UI sections
function showLogin() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('register-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
}

async function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.username;
  await updateBalanceAndHistory();
}

// Register user
async function register() {
  let username = document.getElementById('register-username').value.trim();
  let password = document.getElementById('register-password').value.trim();
  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  alert(data.message);
  if (response.ok) {
    showLogin();
  }
}

// Login user
async function login() {
  let username = document.getElementById('login-username').value.trim();
  let password = document.getElementById('login-password').value.trim();
  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (response.ok) {
    currentUser = { id: data.user.id, username: data.user.username };
    showDashboard();
  } else {
    alert(data.message);
  }
}

function logout() {
  currentUser = null;
  showLogin();
}

// Update balance and transaction history
async function updateBalanceAndHistory() {
  if (!currentUser) return;
  const response = await fetch(`${API_URL}/user/${currentUser.id}`);
  if (!response.ok) {
    alert('Failed to fetch user data');
    return;
  }
  const data = await response.json();
  document.getElementById('balance').textContent = parseFloat(data.balance).toFixed(2);

  const transactionList = document.getElementById('transaction-list');
  transactionList.innerHTML = '';
  data.transactions.forEach(tx => {
    let li = document.createElement('li');
    let date = new Date(tx.transaction_date).toLocaleString();
    li.textContent = `${tx.type}: $${parseFloat(tx.amount).toFixed(2)} - ${date}`;
    transactionList.appendChild(li);
  });
}

// Deposit money
async function deposit() {
  let amount = parseFloat(document.getElementById('amount').value);
  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount');
    return;
  }
  const response = await fetch(`${API_URL}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, amount })
  });
  const data = await response.json();
  alert(data.message);
  if (response.ok) {
    updateBalanceAndHistory();
    document.getElementById('amount').value = '';
  }
}

// Withdraw money
async function withdraw() {
  let amount = parseFloat(document.getElementById('amount').value);
  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount');
    return;
  }
  const response = await fetch(`${API_URL}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, amount })
  });
  const data = await response.json();
  alert(data.message);
  if (response.ok) {
    updateBalanceAndHistory();
    document.getElementById('amount').value = '';
  }
}

// Toggle show/hide of graph section and button
function toggleGraphs(show) {
  document.getElementById('graphs-section').style.display = show ? 'block' : 'none';
  document.getElementById('show-graphs-btn').style.display = show ? 'none' : 'inline-block';
  if (show) {
    fetchUserTransactionsAndRender();
  }
}

// Fetch transactions from backend and render chart + rank
async function fetchUserTransactionsAndRender() {
  if (!currentUser) return;
  try {
    const response = await fetch(`${API_URL}/user/${currentUser.id}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    renderTransactionChart(data.transactions);
    fetchUserRank(currentUser.id);
  } catch (error) {
    alert('Error loading transaction graphs and rank');
  }
}

// Render transaction chart using Chart.js
function renderTransactionChart(transactions) {
  const ctx = document.getElementById('transactions-bar').getContext('2d');
  // Sort transactions by date ascending
  transactions.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  const labels = transactions.map(tx => new Date(tx.transaction_date).toLocaleDateString());
  const dataPoints = transactions.map(tx => tx.type === 'Withdraw' ? -parseFloat(tx.amount) : parseFloat(tx.amount));
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Transaction Amount',
        data: dataPoints,
        borderColor: 'blue',
        backgroundColor: 'lightblue',
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Fetch user rank from backend and update UI
async function fetchUserRank(userId) {
  try {
    const response = await fetch(`${API_URL}/rank/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch rank');
    const data = await response.json();
    document.getElementById('user-rank').textContent = data.rank;
  } catch (error) {
    document.getElementById('user-rank').textContent = 'N/A';
  }
}

// Initialize UI on page load
showLogin();
