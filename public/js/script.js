// ======= Frontend script for UI, notifications, search, signup/login =======

// Global state
let isLoggedIn = false;
let userName = '';
let userBalance = '0.00₽';

// DOM helpers
function createNotification(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// Toggle password helper (used in EJS)
function togglePassword(fieldId, el) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (el) el.textContent = 'Hide';
  } else {
    input.type = 'password';
    if (el) el.textContent = 'Show';
  }
}

// Update navbar state (hide/show auth links)
function updateNavbarAfterAuth() {
  const authLinks = document.querySelectorAll('.signup-link, .login-link');
  const navRight = document.querySelector('.nav-right');

  // remove any existing user display
  const existingUser = document.querySelector('.nav-user-inline');
  if (existingUser) existingUser.remove();

  if (isLoggedIn) {
    // hide auth links
    authLinks.forEach(a => a.style.display = 'none');

    // show small user info
    const userSpan = document.createElement('div');
    userSpan.className = 'nav-user-inline';
    userSpan.style.display = 'flex';
    userSpan.style.alignItems = 'center';
    userSpan.style.gap = '8px';
    userSpan.style.color = '#fff';

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = userName ? userName.charAt(0).toUpperCase() : 'U';

    const txt = document.createElement('div');
    txt.style.fontWeight = '600';
    txt.textContent = `${userName} (${userBalance})`;

    // add logout link within dropdown simple
    const logout = document.createElement('a');
    logout.href = '#';
    logout.textContent = 'Logout';
    logout.style.marginLeft = '10px';
    logout.style.color = '#fff';
    logout.style.fontSize = '0.9rem';
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      // simple logout (client-side); if you have server session, call /logout
      isLoggedIn = false;
      userName = '';
      userBalance = '0.00₽';
      updateNavbarAfterAuth();
      createNotification('Logged out', 'info');
    });

    userSpan.appendChild(avatar);
    userSpan.appendChild(txt);
    userSpan.appendChild(logout);

    navRight.insertBefore(userSpan, navRight.firstChild);
  } else {
    // show auth links
    authLinks.forEach(a => a.style.display = '');
  }
}

// Intercept signup form and POST via fetch
async function handleSignupSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const firstName = form.firstName?.value?.trim();
  const lastName = form.lastName?.value?.trim();
  const email = form.email?.value?.trim();
  const password = form.password?.value;
  const confirmPassword = form.confirmPassword?.value;
  const agreeTerms = form.agreeTerms?.checked ? 'on' : '';

  if (!firstName || !lastName || !email || !password) {
    createNotification('Please fill all fields', 'error');
    return;
  }
  if (password !== confirmPassword) {
    createNotification("Passwords don't match", 'error');
    return;
  }
  if (!agreeTerms) {
    createNotification('You must agree to the terms and conditions', 'error');
    return;
  }

  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ firstName, lastName, email, password, confirmPassword, agreeTerms })
    });
    const text = await res.text();

    if (text.includes('Login')) {  // Success: redirected to /login
      createNotification('Account created successfully! Please log in.', 'success');
      setTimeout(() => window.location.href = '/login', 800);
    } else if (text.includes('Create Account')) {  // Error: redirected back to /signup
      createNotification('Signup failed. Please check your input or agreement.', 'error');
    } else {
      createNotification('Unexpected error occurred.', 'error');
    }
  } catch (err) {
    createNotification('Signup failed', 'error');
    console.error(err);
  }
}

// Intercept login form and POST via fetch
async function handleLoginSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email?.value?.trim();
  const password = form.password?.value;

  if (!email || !password) {
    createNotification('Enter email and password', 'error');
    return;
  }

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password })
    });
    const text = await res.text();

    if (text.includes('Discover Premium Digital Goods')) {  // Success: redirected to /
      isLoggedIn = true;
      userName = email.split('@')[0];
      userBalance = '$0.00';  // Default for new users
      updateNavbarAfterAuth();
      createNotification('Login successful!', 'success');
      setTimeout(() => window.location.href = '/', 800);
    } else if (text.includes('Login')) {  // Error: redirected back to /login
      createNotification('Invalid email or password', 'error');
    } else {
      createNotification('Unexpected error occurred.', 'error');
    }
  } catch (err) {
    createNotification('Login failed', 'error');
    console.error(err);
  }
}

// Search helper: simple highlight (basic)
function performSearch(term) {
  if (!term) {
    // reset
    document.querySelectorAll('.service-item').forEach(it => it.style.opacity = '1');
    return;
  }
  const q = term.toLowerCase();
  const items = Array.from(document.querySelectorAll('.service-item'));
  let found = false;
  items.forEach(it => {
    const name = (it.getAttribute('data-name') || it.textContent || '').toLowerCase();
    if (name.includes(q)) {
      it.style.opacity = '1';
      found = true;
    } else {
      it.style.opacity = '0.25';
    }
  });
  if (!found) createNotification(`No services found for "${term}"`, 'error');
}

// Store search functionality
function performStoreSearch() {
  const searchTerm = document.getElementById('storeSearch').value.trim().toLowerCase();
  const searchResults = document.getElementById('searchResults');
  const storeCards = document.querySelectorAll('.store-rank-card');

  if (!searchTerm) {
    // Reset display
    storeCards.forEach(card => card.style.display = 'block');
    if (searchResults) searchResults.style.display = 'none';
    return;
  }

  let foundResults = 0;
  storeCards.forEach(card => {
    const storeName = card.querySelector('.store-name').textContent.toLowerCase();
    const storeOwner = card.querySelector('.store-owner').textContent.toLowerCase();
    const storeCategory = card.querySelector('.store-category').textContent.toLowerCase();

    const matchesSearch =
      storeName.includes(searchTerm) ||
      storeOwner.includes(searchTerm) ||
      storeCategory.includes(searchTerm);

    if (matchesSearch) {
      card.style.display = 'block';
      foundResults++;
    } else {
      card.style.display = 'none';
    }
  });

  // Show search results message
  if (searchResults) {
    if (foundResults === 0) {
      searchResults.innerHTML = `<div class="no-results">No stores found matching "${searchTerm}"</div>`;
      searchResults.classList.add('no-results');
    } else {
      searchResults.innerHTML = `<div class="results-count">Found ${foundResults} store${foundResults !== 1 ? 's' : ''} matching "${searchTerm}"</div>`;
      searchResults.classList.remove('no-results');
    }
    searchResults.style.display = 'block';
  }

  createNotification(`Found ${foundResults} store${foundResults !== 1 ? 's' : ''} matching "${searchTerm}"`, foundResults > 0 ? 'success' : 'info');
}

// Scroll smooth to sections
function smoothScrollTo(target) {
  const element = document.querySelector(target);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// Support Widget Functions
function toggleSupportWidget() {
  const widget = document.getElementById('supportWidget');
  if (!widget) return;

  if (widget.classList.contains('show')) {
    widget.classList.remove('show');
    widget.classList.remove('animated');
  } else {
    widget.classList.add('show');
    widget.classList.add('animated');
    createNotification('Contact support through your preferred channel!', 'success');
  }
}

function openWhatsApp() {
  const phoneNumber = '+923086878176';
  const message = encodeURIComponent('Hello! I need help with DigitalMarket.');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  window.open(whatsappUrl, '_blank');
  createNotification('Opening WhatsApp for support...', 'success');
}

function openTelegram() {
  const username = 'MultaniMitti';
  const telegramUrl = `https://t.me/${username}`;

  window.open(telegramUrl, '_blank');
  createNotification('Opening Telegram for support...', 'success');
}

function openEmail() {
  const email = 'kabirali6868@gmail.com';
  const subject = encodeURIComponent('Support Request - DigitalMarket');
  const body = encodeURIComponent('Hello,\n\nI need assistance with DigitalMarket.\n\nPlease describe the issue or question:\n\n');
  const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

  window.location.href = mailtoUrl;
  createNotification('Opening email client for support...', 'success');
}

// Live Chat Functionality
function startLiveChat() {
  const supportOptions = document.getElementById('supportOptions');
  const liveChatInterface = document.getElementById('liveChatInterface');

  if (supportOptions && liveChatInterface) {
    supportOptions.style.display = 'none';
    liveChatInterface.style.display = 'block';

    // Initialize chat if first time
    if (!document.querySelector('.welcome-message.shown')) {
      setTimeout(() => {
        loadChatHistory();
      }, 500);
    }

    // Focus on input
    const chatInput = document.getElementById('messageInput');
    if (chatInput) {
      setTimeout(() => chatInput.focus(), 300);
    }
  }
}

function backToOptions() {
  const supportOptions = document.getElementById('supportOptions');
  const liveChatInterface = document.getElementById('liveChatInterface');

  if (supportOptions && liveChatInterface) {
    liveChatInterface.style.display = 'none';
    supportOptions.style.display = 'flex';
  }
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendButton');

  if (!input || !input.value.trim()) return;

  const message = input.value.trim();
  input.value = '';

  // Add user message
  addMessage('user', message);

  // Show typing indicator
  showTypingIndicator();

  // Disable send button temporarily
  sendBtn.disabled = true;

  // Simulate bot response delay (1-3 seconds)
  const delay = Math.random() * 2000 + 1000;
  setTimeout(() => {
    hideTypingIndicator();
    sendBtn.disabled = false;
    generateResponse(message);
  }, delay);
}

function addMessage(sender, content) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');

  messageDiv.className = `message ${sender}-message`;
  messageDiv.innerHTML = `
    <div class="message-content">
      <p>${content}</p>
      <div class="message-time">${getTimeString()}</div>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  scrollToBottom();

  // Save to localStorage
  saveMessage(sender, content);

  return messageDiv;
}

function showTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) typingIndicator.style.display = 'flex';
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) typingIndicator.style.display = 'none';
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
  }
}

function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateResponse(userMessage) {
  const responses = {
    // Greetings
    greeting: [
      'Hello! 👋 Welcome to DigitalMarket Support. How can I help you today?',
      'Hi there! 😊 I\'m here to assist you with any questions about our platform.',
      'Welcome! 🎉 How may I assist you today?'
    ],

    // Account related
    account: [
      'For account issues, you can update your profile in the dashboard. Would you like me to guide you there?',
      'I can help you with account settings. You can manage your profile by clicking on your name in the top right.',
      'Account management is easy! Access your profile settings from the dropdown menu.',
      'Need help with your account? I can guide you through the profile settings.'
    ],

    // Store related
    stores: [
      'Our stores section has amazing digital products! You can browse by category or search for specific items.',
      'Looking for stores? Check out our curated collection of top-selling digital stores.',
      'You can explore all stores on our platform using the search feature to find exactly what you need.',
      'Our stores offer a wide variety of digital products. Try using the search bar to find specific categories.'
    ],

    // Payment related
    payment: [
      'We support secure payment methods. You can add balance using our top-up feature.',
      'For payments, you can use our secure balance system. Top-up options are available in your profile.',
      'Payment help? Reach out to our support team directly via email for specific transaction inquiries.',
      'We prioritize secure payments. Contact our support team for personalized payment assistance.'
    ],

    // Technical issues
    technical: [
      'For technical issues, try refreshing your browser or clearing cache. If the problem persists, let me know!',
      'Technical troubles? Try clearing your browser cache and cookies, then refresh the page.',
      'Having technical difficulties? Make sure you\'re using a supported browser like Chrome or Firefox.',
      'For best experience, ensure your browser is updated and try accessing from a different device if possible.'
    ],

    // General inquiries
    general: [
      'I\'d be happy to help! Feel free to ask me anything about DigitalMarket.',
      'I\'m here to assist with any questions you have about our platform.',
      'Let me know what you\'d like to know about our services.',
      'I\'m ready to help with any questions you might have!'
    ]
  };

  const userMsg = userMessage.toLowerCase();
  let responseType = 'general';

  // Categorize the message
  if (userMsg.includes('hello') || userMsg.includes('hi') || userMsg.includes('hey')) {
    responseType = 'greeting';
  } else if (userMsg.includes('account') || userMsg.includes('profile') || userMsg.includes('login')) {
    responseType = 'account';
  } else if (userMsg.includes('store') || userMsg.includes('product') || userMsg.includes('buy')) {
    responseType = 'stores';
  } else if (userMsg.includes('payment') || userMsg.includes('balance') || userMsg.includes('price')) {
    responseType = 'payment';
  } else if (userMsg.includes('not working') || userMsg.includes('error') || userMsg.includes('problem')) {
    responseType = 'technical';
  }

  const possibleResponses = responses[responseType] || responses['general'];
  const randomResponse = possibleResponses[Math.floor(Math.random() * possibleResponses.length)];

  addMessage('bot', randomResponse);
}

function saveMessage(sender, content) {
  try {
    const chatHistory = JSON.parse(localStorage.getItem('digitalMarket_chat') || '[]');
    chatHistory.push({
      sender: sender,
      content: content,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50);
    }

    localStorage.setItem('digitalMarket_chat', JSON.stringify(chatHistory));
  } catch (e) {
    // Handle localStorage error
  }
}

function loadChatHistory() {
  try {
    const chatHistory = JSON.parse(localStorage.getItem('digitalMarket_chat') || '[]');
    const welcomeMessage = document.querySelector('.welcome-message');

    if (chatHistory.length > 0) {
      // Check if welcome message is already shown
      if (!welcomeMessage.classList.contains('shown')) {
        welcomeMessage.classList.add('shown');
      }

      // Load recent messages (last 20)
      const recentMessages = chatHistory.slice(-20);
      recentMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}-message`;
        messageDiv.innerHTML = `
          <div class="message-content">
            <p>${msg.content}</p>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `;
        document.getElementById('chatMessages').appendChild(messageDiv);
      });
    } else {
      welcomeMessage.classList.add('shown');
    }

    scrollToBottom();
  } catch (e) {
    // Handle error loading chat history
  }
}

function clearChatHistory() {
  try {
    localStorage.removeItem('digitalMarket_chat');
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      // Clear chat and show a reset message
      const resetMessage = document.createElement('div');
      resetMessage.className = 'message bot-message reset-message';
      resetMessage.innerHTML = `
        <div class="message-content" style="background: linear-gradient(135deg, #4ade80, #22c55e);">
          <p>🗑️ Chat history has been cleared. Let's start fresh!</p>
          <div class="message-time">${getTimeString()}</div>
        </div>
      `;
      chatMessages.innerHTML = '';
      chatMessages.appendChild(resetMessage);

      // Add welcome message back
      setTimeout(() => {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message message bot-message';
        welcomeMessage.innerHTML = `
          <div class="message-content" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <p>👋 Hello! Welcome to DigitalMarket Support. How can I help you today?</p>
            <div class="message-time">${getTimeString()}</div>
          </div>
        `;
        chatMessages.appendChild(welcomeMessage);
        welcomeMessage.classList.add('shown');
        scrollToBottom();
      }, 1000);
    }
    createNotification('Chat history cleared successfully!', 'success');
  } catch (e) {
    createNotification('Unable to clear chat history', 'error');
  }
}

// Mobile Menu Functionality
function toggleMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');

  if (mobileMenuToggle && mobileNavOverlay) {
    const isActive = mobileMenuToggle.classList.contains('active');

    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

function openMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');

  if (mobileMenuToggle && mobileNavOverlay) {
    mobileMenuToggle.classList.add('active');
    mobileNavOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
}

function closeMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');

  if (mobileMenuToggle && mobileNavOverlay) {
    mobileMenuToggle.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }
}

// Close mobile menu when clicking on overlay or close button
function handleMobileMenuClose(e) {
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');

  if (e.target === mobileNavOverlay || e.target === mobileNavClose) {
    closeMobileMenu();
  }
}

// Close mobile menu when clicking on a navigation link
function handleMobileNavLinkClick() {
  // Small delay to allow the link to process before closing
  setTimeout(() => {
    closeMobileMenu();
  }, 150);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // wire auth forms
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');

  if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

  // simple search wiring (nav)
  const sInput = document.getElementById('searchInput');
  const sBtn = document.getElementById('searchBtn');
  if (sBtn && sInput) {
    sBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch(sInput.value.trim());
    });
    sInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') performSearch(sInput.value.trim());
    });
  }

  // Store search wiring
  const storeSearchInput = document.getElementById('storeSearch');
  const storeSearchBtn = document.querySelector('.search-btn');

  if (storeSearchBtn && storeSearchInput) {
    storeSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performStoreSearch();
    });
    storeSearchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') performStoreSearch();
    });
  }

  // Live chat input handling
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');

  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Footer smooth scrolling
  const footerLinks = document.querySelectorAll('.footer-links a[href^="#"]');
  footerLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = this.getAttribute('href');
      smoothScrollTo(target);
    });
  });

  // Close support widget when clicking outside
  document.addEventListener('click', function(e) {
    const widget = document.getElementById('supportWidget');
    const floatingBtn = document.querySelector('.support-floating-btn');
    const footerSupport = document.querySelector('.support-link');

    if (widget && widget.classList.contains('show')) {
      const isClickInsideWidget = widget.contains(e.target);
      const isClickOnButton = floatingBtn && floatingBtn.contains(e.target);
      const isClickOnFooterLink = footerSupport && footerSupport.contains(e.target);

      if (!isClickInsideWidget && !isClickOnButton && !isClickOnFooterLink) {
        toggleSupportWidget();
      }
    }
  });

  // Mobile Menu Event Listeners
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }

  if (mobileNavOverlay) {
    mobileNavOverlay.addEventListener('click', handleMobileMenuClose);
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', handleMobileMenuClose);
  }

  // Close mobile menu when clicking on navigation links
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', handleMobileNavLinkClick);
  });

  // Close mobile menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });

  // show/hide password toggles already inline via onclick attributes

  // initialize navbar state
  updateNavbarAfterAuth();

  // optional: auto-reveal any server flash messages in DOM (if you add them)
  const flash = document.querySelector('.flash-msg');
  if (flash) {
    setTimeout(() => flash.remove(), 5000);
  }
});
