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
  let minMessageNumber = null;
  let maxMessageNumber = null;
  let isLoadingHistory = false;
  let hasMoreHistory = true;
  let scrollPositionBeforeLoad = 0;

  // Connect to WebSocket server
  function connectWebSocket(isReconnect = false) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/${window.location.hash.substring(1)}`);
    
    socket.onopen = () => {
      connectionStatus.textContent = 'Connected';
      connectionStatus.classList.add('connected');
      
      if (isReconnect) {
        // Clear existing messages and state
        messagesContainer.innerHTML = '';
        newestMessageId = null;
        minMessageNumber = null;
        maxMessageNumber = null;
        
        // If we have a username, send join message
        if (username) {
          socket.send(JSON.stringify({
            type: 'join',
            username
          }));
        }
      }
    };
    
    socket.onclose = () => {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.classList.remove('connected');
      
      // Try to reconnect after a delay
      setTimeout(() => connectWebSocket(true), 3000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
  //console.log(`min: ${minMessageNumber} max:${maxMessageNumber}`)
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          //Keep track of msg.message_number min and max value, min is the oldest, max is the newest, if a message is between min or max we already have it so dont add it!
          case 'history':
            // Clear existing messages first
            if (messagesContainer.children.length === 0) { // Initial load
              messagesContainer.innerHTML = '';
              data.messages.forEach(msg => {
                if ((minMessageNumber && msg.message_number >= minMessageNumber) &&
                    (maxMessageNumber && msg.message_number <= maxMessageNumber)) {
                  console.log('Rejected duplicate history message:', msg);
                  return;
                }
                addMessageToUI(msg);
                if (minMessageNumber === null || msg.message_number < minMessageNumber) {
                  minMessageNumber = msg.message_number;
                }
                if (maxMessageNumber === null || msg.message_number > maxMessageNumber) {
                  maxMessageNumber = msg.message_number;
                }
              });
            } else { // Paginated load OR we lost connection.. and server sends its first history 
            //What happens if there has been more than 50 messages from disconnection to reconnection????
              scrollPositionBeforeLoad = messagesContainer.scrollHeight - messagesContainer.scrollTop;
              // Create temporary container for new messages
              const tempContainer = document.createElement('div');
              data.messages.forEach(msg => {
                if (minMessageNumber !== null && maxMessageNumber !== null &&
                    msg.message_number >= minMessageNumber &&
                    msg.message_number <= maxMessageNumber) {
                  //console.log('Rejected duplicate paginated message:', msg);
                  return;
                }
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
              minMessageNumber = data.firstId;
              hasMoreHistory = data.messages.length > 0;
            }
            isLoadingHistory = false;
            break;
            
          case 'message':
          case 'system': {

              if (minMessageNumber && maxMessageNumber &&
                  data.message_number >= minMessageNumber &&
                  data.message_number <= maxMessageNumber) {
                console.log('Rejected duplicate message:', {
                  reason: 'Duplicate',
                  message: data,
                  range: {min: minMessageNumber, max: maxMessageNumber}
                });
              } else {
                addMessageToUI(data);
                if (minMessageNumber === null || data.message_number < minMessageNumber) {
                  minMessageNumber = data.message_number;
                }
                if (maxMessageNumber === null || data.message_number > maxMessageNumber) {
                  maxMessageNumber = data.message_number;
                }
              }
            break;
          }
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
    messagesContainer.appendChild(createMessageElement(message));
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
      //const scrollPosition = messagesContainer.scrollTop + messagesContainer.clientHeight;
      
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
    if (!minMessageNumber || isLoadingHistory || !hasMoreHistory) return;
    
    isLoadingHistory = true;
    try {
      socket.send(JSON.stringify({
        type: 'history',
        id: minMessageNumber,
        count: 50
      }));
    } catch (error) {
      console.error('Error loading history:', error);
      isLoadingHistory = false;
    }
  }
});
