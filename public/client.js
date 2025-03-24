document.addEventListener('DOMContentLoaded', () => {
  const messagesContainer = document.getElementById('messages-container');
  const messageInput = document.getElementById('message-input');
  const usernameInput = document.getElementById('username-input');
  const sendButton = document.getElementById('send-button');
  const joinButton = document.getElementById('join-button');
  const loginForm = document.getElementById('login-form');
  const messageForm = document.getElementById('message-form');
  const connectionStatus = document.getElementById('connection-status');
  
  let socket;
  let username = '';
  let oldestMessageId = null;
  let isLoadingHistory = false;
  let hasMoreHistory = true;
  let scrollPositionBeforeLoad = 0;

  // Connect to WebSocket server
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      connectionStatus.textContent = 'Connected';
      connectionStatus.classList.add('connected');
    };
    
    socket.onclose = () => {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.classList.remove('connected');
      
      // Try to reconnect after a delay
      setTimeout(connectWebSocket, 3000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'history':
            // Clear existing messages first
            if (messagesContainer.children.length === 0) { // Initial load
              messagesContainer.innerHTML = '';
              data.messages.forEach(msg => addMessageToUI(msg));
              oldestMessageId = data.firstId;
            } else { // Paginated load
              scrollPositionBeforeLoad = messagesContainer.scrollHeight - messagesContainer.scrollTop;
              // Create temporary container for new messages
              const tempContainer = document.createElement('div');
              data.messages.forEach(msg => {
                const element = createMessageElement(msg);
                tempContainer.appendChild(element);
              });
              
              // Insert new messages at the top while maintaining scroll position
              const firstChild = messagesContainer.firstChild;
              while (tempContainer.firstChild) {
                messagesContainer.insertBefore(tempContainer.firstChild, firstChild);
              }
              
              // Restore scroll position
              messagesContainer.scrollTop = messagesContainer.scrollHeight - scrollPositionBeforeLoad;
              oldestMessageId = data.firstId;
              hasMoreHistory = data.messages.length > 0;
            }
            isLoadingHistory = false;
            break;
            
          case 'message':
          case 'system':
            addMessageToUI(data);
            break;
        }
        
        // Scroll to the latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }
  
  // Create a message element
  function createMessageElement(message) {
    const messageElement = document.createElement('div');
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    if (message.type === 'system') {
      messageElement.className = 'message system';
      messageElement.innerHTML = `
        <div class="content">${message.content}</div>
        <div class="timestamp">${timestamp}</div>
      `;
    } else {
      const isCurrentUser = message.username === username;
      messageElement.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
      
      if (!isCurrentUser) {
        messageElement.innerHTML += `<div class="username">${message.username}</div>`;
      }
      
      messageElement.innerHTML += `
        <div class="content">${message.content}</div>
        <div class="timestamp">${timestamp}</div>
      `;
    }
    
    return messageElement;
  }

  // Add a message to the UI
  function addMessageToUI(message) {
    const messageElement = document.createElement('div');
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    if (message.type === 'system') {
      messageElement.className = 'message system';
      messageElement.innerHTML = `
        <div class="content">${message.content}</div>
        <div class="timestamp">${timestamp}</div>
      `;
    } else {
      const isCurrentUser = message.username === username;
      messageElement.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
      
      if (!isCurrentUser) {
        messageElement.innerHTML += `<div class="username">${message.username}</div>`;
      }
      
      messageElement.innerHTML += `
        <div class="content">${message.content}</div>
        <div class="timestamp">${timestamp}</div>
      `;
    }
    
    messagesContainer.appendChild(messageElement);
  }
  
  // Join the chat
  joinButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    
    if (username) {
      // Send join message
      socket.send(JSON.stringify({
        type: 'join',
        username
      }));
      
      // Show message form and hide login form
      loginForm.classList.add('hidden');
      messageForm.classList.remove('hidden');
      
      // Focus on message input
      messageInput.focus();
    }
  });
  
  // Handle enter key in username input
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinButton.click();
    }
  });
  
  // Send a message
  function sendMessage() {
    const content = messageInput.value.trim();
    
    if (content && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'message',
        content
      }));
      
      // Clear input field
      messageInput.value = '';
    }
  }
  
  // Send button click handler
  sendButton.addEventListener('click', sendMessage);
  
  // Handle enter key in message input
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Handle scroll for history loading
  let scrollTimeout;
  messagesContainer.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (isLoadingHistory || !hasMoreHistory) return;
      
      // Trigger if near top (100px) or at top (<= 0)
      const scrollThreshold = 100;
      const scrollPosition = messagesContainer.scrollTop + messagesContainer.clientHeight;
      
      // Trigger load when within 100px of the top and content is scrollable
      if ((messagesContainer.scrollTop < scrollThreshold) &&
          (messagesContainer.scrollHeight > messagesContainer.clientHeight)) {
        loadOlderMessages();
      }
    }, 150);
  });

  // Initialize connection
  connectWebSocket();

  // Load older messages
  async function loadOlderMessages() {
    if (!oldestMessageId || isLoadingHistory || !hasMoreHistory) return;
    
    isLoadingHistory = true;
    try {
      socket.send(JSON.stringify({
        type: 'history',
        id: oldestMessageId,
        count: 50
      }));
    } catch (error) {
      console.error('Error loading history:', error);
      isLoadingHistory = false;
    }
  }
});