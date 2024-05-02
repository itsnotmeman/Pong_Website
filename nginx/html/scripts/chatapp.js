function loadChat() {
  const chat_pill = document.querySelector('#v-pills-chat');
  const content = document.createElement('div');
  content.id = 'chatDiv';
  content.innerHTML = `
  <div class="container mt-0">
  <div class="row">
    <div class="col-md-12">
        <!-- WebSocket connection indicator -->
        <p><span id="websocketStatus"></span></p>
    </div>
    
    <div class="col-md-12 mt-0">
      <!-- Dropdown for selecting users -->
      <div class="mb-3">
          <label for="connectedUsers" class="form-label">Conversation With:</label>
          <select class="form-select" id="connectedUsers">
              <option value="">Choose a user...</option>
              <!-- User options will be added dynamically here -->
          </select>
      </div>
    </div>
    <div class="col-md-12 mt-3">
      <button type="button" class="btn btn-primary btn-sm float-end" id="showProfileChat" value="1">Profile</button>
      <!-- Checkbox for enabling message filtering -->
    <div class="form-check">
        <input class="form-check-input" type="checkbox" id="filterCheckbox">
        <label class="form-check-label" for="filterCheckbox">Filter messages by conversation</label>
    </div>
      <!-- Checkbox for enabling message blocking -->
      <div class="form-check">
          <input class="form-check-input" type="checkbox" id="blockCheckbox">
          <label class="form-check-label" for="blockCheckbox">Block messages from this user</label>
      </div>
    </div>

    <div class="col-md-12 mt-3">
        <!-- Large rectangular text area for conversation messages -->
        <div class="card" style="width: 100%;">
          <div class="card-body" id="chatMessages" style="height: 24rem; overflow-y: auto;">
              <!-- Messages go here -->
          </div>
        </div>
    </div>

    <div class="col-md-12 mt-3">
        <!-- 1-line text entry box for sending messages -->
        <div class="input-group">
            <input type="text" class="form-control" id="messageInput" placeholder="Type your message...">
            <div class="input-group-append d-grid gap-2 d-md-flex">
                <button class="btn btn-primary" id="sendMessageBtn">Send</button>
                <button class="btn btn-info" id="inviteToGameBtn">Invite to Game</button>
            </div>
        </div>
    </div>

  </div>
</div>
  `;
  chat_pill.appendChild(content);

  // Connect to WebSocket when the page loads
  const socket = connectWebSocket();

  socket.onmessage = function (event) {
    var data = JSON.parse(event.data);
    // Check the type of the message
    if (data.type === "chat_message") {
      // Handle chat message
      handleChatMessage(data);
    } else if (data.type === "user_list_update") {
      // Handle user list update
      updateUserList(data.users); // Pass the list of users to updateUserList
    } else if (data.type === "service_message") {
      // Handle service message
      handleServiceMessage(data);
    } else if (data.type === "game_update") {
      // 'data.game_data' contains the updated game information
      fetchAvailableGames();
    } else if (data.type === "game_invitation") {
      handleGameInvitation(data);
    } else if (data.type === "game_notif") {
      handleGameNotif(data);
    }
  };

  // Event listener for the "Invite to game" button
  document.getElementById("inviteToGameBtn").addEventListener("click", function () {
    inviteToGame(socket);
  });
document.querySelector("#showProfileChat").addEventListener("click", handleChatProfileClick);





// Event listener for the "Block messages" checkbox
document.getElementById("blockCheckbox").addEventListener("change", function () {
  const isChecked = this.checked;
  const userId = document.getElementById("connectedUsers").value;

  // Check if "Choose user..." is selected in the dropdown
  if (userId === "default" || userId.trim() === "") { // Assuming "default" is the value for "Choose user..."
    alert("Please select a user before changing the block status.");
    // Optionally, uncheck the checkbox since no user is selected
    this.checked = false;
    return; // Exit the function without calling updateBlockedStatus
  }

  // If a user is selected, call the function to update the blocked status in the backend
  updateBlockedStatus(userId, isChecked);
});

  // Initialize dropdown and message filter on page load
  updateUserList([]); // Pass empty or actual users if already available

  // Ensure "Choose user..." is selected by default
  const userList = document.getElementById("connectedUsers");
  if (!userList.selectedOptions.length) {
    userList.value = "";
    filterMessagesByUser(); // Apply the filter based on the "Global Chat" selection
  }

  // Ensure the filter is applied right after the user list is updated and on every change in the dropdown
  document.getElementById("connectedUsers").addEventListener("change", function () {
  const selectedUserId = this.value;

  // Call the function to fetch the blocked status for the selected user
  getBlockedStatus(selectedUserId);

  // Call the function to filter messages by the selected user
  filterMessagesByUser();
});

  document.getElementById("sendMessageBtn").addEventListener("click", function () {
    sendMessage(socket)
  });
  document.getElementById("messageInput").addEventListener("keydown", function (event) {
    if (event.key == "Enter") {
      sendMessage(socket);
    }
  });

  filterMessagesByUser();
  document.getElementById("filterCheckbox").addEventListener("change", filterMessagesByUser);
};

async function handleChatProfileClick(event) {
  event.preventDefault;
  idProfile = this.getAttribute('value')
  if (idProfile.trim() !== "") {
    await fetchProfile(idProfile);
    history.pushState("/stats", '', "/stats")
    stats();
  }
  else
    alert("Please select a user before to click this button.");    

};

// Invite to game
function inviteToGame(socket) {
  const currentUserAlias = getCookie("user_alias");
  const currentUserId = getCookie("user_id");

  var selectedUserAlias = document.getElementById("connectedUsers").selectedOptions[0].text; // Display name, not value
  var selectedUserId = document.getElementById("connectedUsers").value; // Actual value (user ID)

  if (selectedUserId.trim() !== "") {
      // Define the invitation message
      var invitationMessage = "You have been invited by " + currentUserAlias + " to a game of Pong !";

      // Send the invitation message via WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
          var payload = {
              type: "game_invitation",
              message: invitationMessage,
              to_user: selectedUserId,
              sender_id: currentUserId,
              recipient_id: selectedUserId,
              sender_alias: currentUserAlias,
              recipient_alias: selectedUserAlias,
          };
          socket.send(JSON.stringify(payload));

          // Immediately display the invitation as a sent message to the sender
          fetchStatusUser(selectedUserAlias, selectedUserId );
      }
  } else {
      alert("Please select a user to invite.");
  }
}

async function fetchStatusUser(toAlias, aliasId) {

  await fetch(`${baseURL}/users/user/${aliasId}`)
  .then((response) => {
    if (!response.ok) {
      throw new Error('HTTP error: ${response.status}');
    }
    return response.json();
    })
    .then(json => {
      displaySentInvitation(json, toAlias)
    })
    .catch(error => console.error('Error fetch:', error));
};



// Display sent invitation in the chat
function displaySentInvitation( user, toAlias) {
  var messageText = document.createElement("div");
  messageText.className = "invite-container";
  var messageContainer = document.createElement("div");

  if (user.status != "online" && user.status != "playing_online") {
    messageText.textContent = `${toAlias} is not online at this time !`;
  }
  else {  
    messageText.textContent = `You have invited ${toAlias} to a game of Pong !`;
  }

  messageContainer.appendChild(messageText);

  var chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(messageContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateWebSocketStatus(connected) {
  var websocketStatus = document.getElementById("websocketStatus");
  if (connected) {
    // Hide the status message when connected
    websocketStatus.textContent = "";
    websocketStatus.classList.remove("text-danger");
  } else {
    // Show "Websocket disconnected" in red when disconnected
    websocketStatus.textContent = "Websocket disconnected";
    websocketStatus.classList.add("text-danger");
  }
}

// Establish WebSocket connection
function connectWebSocket() {
  let ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
  let ws_url = ws_scheme + '://' + window.location.host + "/ws/chat/";

  // Create the WebSocket connection
  const socket = new WebSocket(ws_url);
  socket.onopen = function (event) {
    updateWebSocketStatus(true); // Connection is open
    socket.send(JSON.stringify({ type: "request_user_list" }));
  };

  socket.onclose = function (event) {
    updateWebSocketStatus(false); // Connection is closed
    //setTimeout(connectWebSocket, 1000); // Attempt to reconnect after 5 seconds
  };
  return (socket);
}

function sendMessage(socket) {
  // Get the message from the input box
  var messageInput = document.getElementById("messageInput");
  var message = messageInput.value;

  // Get the selected user from the dropdown
  var selectedUser = document.getElementById("connectedUsers").value;

  if (selectedUser === "" || selectedUser === "default") {
    alert("Please select a user to send your message to.");
    return;
  }

  if (message.trim() !== "") {
    // Send the message via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      var payload = {
        message: message,
        to_user: selectedUser,
      };
      socket.send(JSON.stringify(payload));
    }

    // Clear the input box
    messageInput.value = "";

    // Scroll down to show the latest message
    var chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function fetchAvailableGames() {
  fetch(`${baseURL}/api/games/`)
    .then(response => response.json())
    .then(gamesList => {
      updateGamesList(gamesList);
    })
    .catch(error => console.error('Error fetching games:', error));
}

function updateUserList(users) {
  const currentUserAlias = getCookie("user_alias");

  const userList = document.getElementById("connectedUsers");
  userList.innerHTML = '<option value="" selected>Select user...</option>';

  users.forEach((user) => {
    // Check if the user is not the current user before adding to the dropdown.
    if (user.alias !== currentUserAlias) {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.alias || 'No Alias';
      userList.appendChild(option);
    }
  });

  // Reapply any necessary filters or settings post-update.
  document.getElementById("connectedUsers").value = "";
  filterMessagesByUser();
  //updateMessagePlaceholder("Select user...");
}

function updateMessagePlaceholder(selectedUserAlias) {
  const messageInput = document.getElementById("messageInput");
  if (!selectedUserAlias) {
    messageInput.placeholder = "Please select user...";
  } else {
    messageInput.placeholder = `Type your message for ${selectedUserAlias}...`;
  }
  
}

function handleChatMessage(data) {
  var messageData = data.content ? data.content : data;

  var messageContainer = document.createElement("div");
  messageContainer.className = "message-container";

  var senderAlias = document.createElement("div");
  senderAlias.className = "name-container";
  senderAlias.textContent = messageData.sender_alias || "Unknown";

  var messageText = document.createElement("div");
  messageText.className = "text-container";
  messageText.textContent = messageData.message;

  var timestamp = document.createElement("div");
  timestamp.className = "message-time";
  timestamp.textContent = messageData.timestamp;

  var recipientAlias = document.createElement("div");
  recipientAlias.className = "recipient-name";
  recipientAlias.textContent = messageData.recipient_alias === 'global' ? "To: Global chat" : `To: ${messageData.recipient_alias}`;

  messageContainer.appendChild(senderAlias);
  messageContainer.appendChild(messageText);
  messageContainer.appendChild(timestamp);
  messageContainer.appendChild(recipientAlias);

  var chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(messageContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Call the filter function to ensure consistency with the current filter
  filterMessagesByUser();
}

function handleServiceMessage(data) {
  var message = data.message ? data.message : "No message";
  var timestamp = data.timestamp ? data.timestamp : "No timestamp";
  
  var messageData = data.content ? data.content : data;
  var game_id = messageData.game_id;

  var serviceMessageElement = document.createElement("div");
  serviceMessageElement.className = "service-message";

  // Format the message with the timestamp
  var formattedMessage = timestamp + " - " + message;
  //serviceMessageElement.textContent = formattedMessage;

  if (game_id) {
    var startGameButton = document.createElement("button");
    startGameButton.textContent = "Accepted, click to start game";
    startGameButton.className = "btn btn-primary btn-sm start-game-button";
    startGameButton.onclick = function() {
      startPong(game_id);
    };
    serviceMessageElement.appendChild(startGameButton);
  }

  var chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(serviceMessageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function requestUserList(socket) {  // Pas utilisé pour le moment.
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "request_user_list" }));
  }
}

function handleGameNotif(data) {
  var message = data.message ? data.message : "No message"; // Keep the message formatting
  var timestamp = data.timestamp ? data.timestamp : "No timestamp";

  // Create a new div element to hold the notification
  var notifElement = document.createElement("div");
  notifElement.className = "game-notif-message"; // This class will be used for styling

  // Create a span for the message, make it bold and centered
  var messageSpan = document.createElement("span");
  messageSpan.className = "notif-message";
  messageSpan.textContent = `${timestamp} - ${message}`;
  notifElement.appendChild(messageSpan);

  // Append the notification element to the chat messages container
  var chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(notifElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


function filterMessagesByUser() {
  const isFilterEnabled = document.getElementById("filterCheckbox").checked;
  const selectedUserAlias = document.getElementById("connectedUsers").selectedOptions[0].text;
  const selectedUserId = document.getElementById("connectedUsers").value;
  // Use the getCookie function to retrieve the user's alias from the cookie
  const currentUserAliasRaw = getCookie("user_alias");
  const currentUserAlias = currentUserAliasRaw.replace(/^"|"$/g, '');
  
  // Fallback in case the cookie is not set
  if (!currentUserAlias) {
    console.error("User alias cookie not found. Defaulting to 'Unknown User'.");
  }
  const messages = document.querySelectorAll(".message-container");

  messages.forEach(message => {
    // Extract message details
    const senderAlias = message.querySelector(".name-container").textContent;
    const recipientAliasText = message.querySelector(".recipient-name").textContent.replace(/^To:\s*/, '');
    const isGlobalMessage = recipientAliasText === "Global chat";

    // Determine if the message was sent by the current user or not
    const isSentMessage = senderAlias === currentUserAlias;

    // Apply styling based on whether the message is sent or received
    if (isSentMessage) {
      message.classList.add("sent-message-style");
      message.classList.remove("received-message-style");
    } else {
      message.classList.add("received-message-style");
      message.classList.remove("sent-message-style");
    }

    // Determine visibility based on filter checkbox and selected user
    let shouldBeVisible = false;
    if (isFilterEnabled) {
      if (selectedUserAlias === "Global Chat" && isGlobalMessage) {
        shouldBeVisible = true;
      } else if (selectedUserAlias !== "Global Chat" && !isGlobalMessage &&
        (senderAlias === selectedUserAlias || recipientAliasText === selectedUserAlias)) {
        shouldBeVisible = true;
      }
    } else {
      // If filter is not enabled, all messages should be visible
      shouldBeVisible = true;
    }

    // Apply visibility
    message.style.display = shouldBeVisible ? "" : "none";
  });
  updatePlaceholderText(selectedUserAlias, selectedUserId );
}

function getCookie(name) {
  let cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    let cookieParts = cookie.split('=');
    if (cookieParts[0] === name) {
      let cookieValue = decodeURIComponent(cookieParts[1]);
      
      // Remove quotes at the beginning and the end, if present
      cookieValue = cookieValue.replace(/^"|"$/g, '');

      return cookieValue;
    }
  }
  return null;
}

// Helper function to update the message input placeholder based on the selected user
function updatePlaceholderText(selectedUserAlias, selectedUserId) {
  const messageInput = document.getElementById("messageInput");
  messageInput.placeholder = selectedUserAlias === "Select user..." ?
    "Please select user..." :
    `Type your message for ${selectedUserAlias}...`;
  const buttonProfile = document.querySelector("#showProfileChat");
  buttonProfile.setAttribute("value", selectedUserId);
}

function handleGameInvitation(data) {
  var invitationMessage = data.message;

  // Create the container for the game invitation message
  var invitationContainer = document.createElement("div");
  invitationContainer.className = "invite-container";
  var messageText = document.createElement("div");
  messageText.className = "invitation-text";
  messageText.textContent = invitationMessage;

  invitationContainer.appendChild(messageText);

// Button for the user to accept the invitation
var acceptButton = document.createElement("button");
acceptButton.className = "btn btn-success btn-sm";
acceptButton.textContent = "Accept Invitation";
acceptButton.onclick = function() {
    // Check if we are in the initial state (Accepting Invitation)
    if (acceptButton.textContent === "Accept Invitation") {
        const requestData = { inviter_id: data.sender_id, invitee_id: data.recipient_id };

        fetch('/api/game/create_from_invitation/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'include',
            body: JSON.stringify(requestData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            acceptButton.textContent = "Start Game";
            acceptButton.onclick = function() {
                startPong(data.game_id);
                this.style.display = 'none';
            };
        })
        .catch(error => {
            console.error("Error creating game from invitation:", error.message);
        });
    }
  };

  invitationContainer.appendChild(acceptButton);
  var chatMessages = document.getElementById("chatMessages");
  chatMessages.appendChild(invitationContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to update the blocked status in the backend
function updateBlockedStatus(userId, isBlocked) {
  fetch('/api/update_blocked_status/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({
          'user_id': userId,
          'is_blocked': isBlocked
      })
  })
  .then(response => {
      if (response.ok) {
      } else {
          console.error('Failed to update blocked status');
      }
  })
  .catch(error => {
      console.error('Error updating blocked status:', error);
  });
}

function getBlockedStatus(userId) {
  // Check if userId is truthy; if not, return early.
  if (!userId) {
    return;
  }

  fetch('/api/get_blocked_status/?user_id=' + userId)
    .then(response => response.json())
    .then(data => {
      const isBlocked = data.is_blocked;
      // Set the checkbox state based on the retrieved status
      document.getElementById("blockCheckbox").checked = isBlocked;
    })
    .catch(error => {
      console.error('Error fetching initial blocked status:', error);
    });
}
