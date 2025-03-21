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
            messagesContainer.innerHTML = '';
            
            // Add message history
            data.messages.forEach(msg => {
              addMessageToUI(msg);
            });
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
  
  // Initialize connection
  connectWebSocket();
});