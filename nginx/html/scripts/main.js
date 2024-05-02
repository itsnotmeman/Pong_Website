document.addEventListener('DOMContentLoaded', loadPage);
window.addEventListener('popstate', navigateTo);

async function loadPage() {
  try {
    await getCsrfToken();
    await getSession();

    setEventListeners();

    const pathname = window.location.pathname;
    // Place the newly loaded site in the browsers history
    // so that it is stored as an object instead of a string.
    history.replaceState(pathname, "");

    // Create a new object so that navigateTo() can access the pathname without error.
    const pathnameState = { state: pathname }
    navigateTo(pathnameState);

  }
  catch (err) {
    // Handle the error here if needed.
    console.error('Error loading page:', err);
  }
}

async function getCsrfToken() {
  try {
    const response = await fetch("/apiauth/csrf/", {
      credentials: "same-origin"
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    localStorage.setItem("csrftoken", response.headers.get("X-CSRFToken"));
    return response.json();
  }
  catch (err) { console.error(`Fetch problem: ${err.message}`) };
}

async function getSession() {
  try {
    const response = await fetch("/apiauth/session/", {
      credentials: "same-origin"
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();  // Await here
    localStorage.setItem("session", data.isAuthenticated);
    if (localStorage.getItem("session") === "true") {
      await getWhoami();
    }
    else {
        createLoginForm();  // In profile.js.
    }
    return data;
  }
  catch (err) { console.error(`Fetch problem: ${err.message}`) };
}

async function getWhoami() {
  try {
    const response = await fetch("/apiauth/whoami/", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();

    // Adjust the header to be a flex container
    const header = document.querySelector('#header');
    header.style.display = 'flex'; // Enable flexbox
    header.style.alignItems = 'center'; // Center-align items vertically
    header.style.backgroundColor = '#333'; // Dark grey background
    header.style.padding = '0 15px'; // Add some padding

    // Adjustments for the title
    const title = document.querySelector("#h1");
    title.innerHTML = 'Pong_Website';
    title.style.color = 'white';
    title.style.flexGrow = '1'; // Allow the title to take up available space

    // Adjustments for userTool, considering removal of position-absolute if possible
    const userTool = document.querySelector('#userTool');
    userTool.style.color = 'white'; // Ensures all text within is white

    // Create the avatar span and welcome message
    const avat_span = document.createElement('span');
    const avatarPath = "media/" + data.avat_img;
    avat_span.innerHTML = `<img id="curr_avatar" src=${avatarPath} alt="current_avatar" class="rounded-circle me-2" style="width: 30px;">`;
    const welcomeMessage = document.createElement('span');
    welcomeMessage.textContent = `Welcome, ${data.username}.`;

    // Append elements to userTool
    userTool.append(avat_span, welcomeMessage);

    createLogoutButton();
  } catch (err) {
    console.error(`Fetch problem: ${err.message}`);
  }
}

function createLogoutButton() {
  //////////////////////////////////////////////////////////////////////////////////
  let host = window.location.host;
  const eventWebsocket = new WebSocket(`wss://${host}/ws/onlineCheck/`);
  eventWebsocket.onmessage = (event) => {

    let data = JSON.parse(event.data)

    if (data.message === "logout") {
      window.location.reload();
    }
    else if (data.message === "redirect_to_game") {
        startButton = document.querySelector("#startLocalGameButton");
        startButton.textContent = "Game Started";
        startButton.disabled = true;
        history.pushState("/game", '', "/game")
        game();
    }
  };
  ////////////////////////////////////////////////////////////////////////////////
  loadProfile();
  loadGame();
  loadTournament();
  loadChat();
  loadLobby();
  loadFriendsPlayers();
  enableTabs();
  //////////////////////////////////////////////////////////////////////////////////

  const profile_pill = document.querySelector('#userTool');

  const content = document.createElement('span');
  content.id = 'logoutButtonDiv';
  content.innerHTML = `
        <button type="submit" id="logoutButton" class="btn btn-primary btn-sm" style="margin: 10px;">Logout</button>
      `;

  profile_pill.appendChild(content);

  document.querySelector("#logoutButton").addEventListener("click", function (event) {
    handleLogoutClick(event, eventWebsocket);
  });
}

function handleLogoutClick(event, eventWebsocket) {
  event.preventDefault();

  const logoutButton = document.querySelector("#logoutButton");

  const request = new Request(
    "/apiauth/logout/", {
    method: 'POST',
    headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
    // mode: 'same-origin', // Do not send CSRF token to another domain.
    credentials: "same-origin",
  });

  // Close the websocket to prevent the server to sent a page reload request
  // back since it's already being reloaded after this fetch call.
  eventWebsocket.close();
  fetch(request)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      logoutButton.removeEventListener("click", handleLogoutClick);
      return response;
    })
    .catch((err) => console.error(`Fetch problem: ${err.message}`))
    .finally(() => {
      // Refresh the page
      window.location.reload();
    });
};

async function getWhoamiid() {
  try {
    const response = await fetch("/apiauth/whoamiid/", {
      credentials: "same-origin"
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    document.querySelector('#curr_id').setAttribute("value", data.id);
    return data;
  }
  catch (err) { console.error(`Fetch problem: ${err.message}`) };
}

// Function to navigate to the appropriate route
function navigateTo(pathname) {
  routes[pathname.state]();
}

// Define the routes and their corresponding handlers
const routes = {
  '/profile': profile,
  '/game': game,
  '/chat': chat,
  '/tournament': tournament,
  '/stats': stats,
  '/lobby': lobby
};

// Define the route handlers
function profile() {
  const selectTab = document.querySelector('#v-pills-profile-tab');
  const showTab = new bootstrap.Tab(selectTab);
  showTab.show(); // Show the specified tab.
}

function game() {
  if (localStorage.getItem("session") === "true") {
    const selectTab = document.querySelector('#v-pills-game-tab');
    const showTab = new bootstrap.Tab(selectTab);
    showTab.show(); // Show the specified tab.
  }
  else {
    // Redirection to profile.
    profile();
    history.replaceState("/game", "", "/profile");
  }
}

function chat() {
  if (localStorage.getItem("session") === "true") {
    const selectTab = document.querySelector('#v-pills-chat-tab');
    const showTab = new bootstrap.Tab(selectTab);
    showTab.show(); // Show the specified tab.
  }
  else {
    // Redirection to profile.
    profile();
    history.replaceState("/chat", "", "/profile");
  }
}

function tournament() {
  if (localStorage.getItem("session") === "true") {
    const selectTab = document.querySelector('#v-pills-tournament-tab');
    const showTab = new bootstrap.Tab(selectTab);
    showTab.show(); // Show the specified tab.
  }
  else {
    // Redirection to profile.
    profile();
    history.replaceState("/tournament", "", "/profile");
  }
}

function stats() {
  if (localStorage.getItem("session") === "true") {
    const selectTab = document.querySelector('#v-pills-stats-tab');
    const showTab = new bootstrap.Tab(selectTab);
    showTab.show(); // Show the specified tab.
  }
  else {
    // Redirection to profile.
    profile();
    history.replaceState("/stats", "", "/profile");
  }
}

function lobby() {
  if (localStorage.getItem("session") === "true") {
    const selectTab = document.querySelector('#v-pills-games-tab');
    const showTab = new bootstrap.Tab(selectTab);
    showTab.show(); // Show the specified tab.
  }
  else {
    // Redirection to profile.
    profile();
    history.replaceState("/lobby", "", "/profile");
  }
}

function setEventListeners() {

  const selectProfileTab = document.querySelector('#v-pills-profile-tab');
  selectProfileTab.addEventListener("click", () => {
    history.pushState("/profile", '', "/profile");
  });

  const selectGameTab = document.querySelector('#v-pills-game-tab');
  selectGameTab.addEventListener("click", () => {
    history.pushState("/game", '', "/game");
  });

  const selectChatTab = document.querySelector('#v-pills-chat-tab');
  selectChatTab.addEventListener("click", () => {
    history.pushState("/chat", '', "/chat");
  });

  const selectTournamentTab = document.querySelector('#v-pills-tournament-tab');
  selectTournamentTab.addEventListener("click", () => {
    history.pushState("/tournament", '', "/tournament");
  });

  const selectStatsTab = document.querySelector('#v-pills-stats-tab');
  selectStatsTab.addEventListener("click", () => {
    history.pushState("/stats", '', "/stats");
  });

  const selectGamesTab = document.querySelector('#v-pills-games-tab');
  selectGamesTab.addEventListener("click", () => {
    history.pushState("/lobby", '', "/lobby");
  });
}

function enableTabs() {
  document.querySelector("#v-pills-game-tab").removeAttribute('disabled');
  document.querySelector("#v-pills-chat-tab").removeAttribute('disabled');
  document.querySelector("#v-pills-tournament-tab").removeAttribute('disabled');
  document.querySelector("#v-pills-stats-tab").removeAttribute('disabled');
  document.querySelector("#v-pills-games-tab").removeAttribute('disabled');
}

function disableTabs() {
  document.querySelector("#v-pills-game-tab").setAttribute('disabled', '');
  document.querySelector("#v-pills-chat-tab").setAttribute('disabled', '');
  document.querySelector("#v-pills-tournament-tab").setAttribute('disabled', '');
  document.querySelector("#v-pills-stats-tab").setAttribute('disabled', '');
  document.querySelector("#v-pills-games-tab").setAttribute('disabled', '');
}

function validSubmit(event) {
  var form = event.target;

  if (!form.checkValidity()) {
    event.preventDefault(); // Prevents from sending the form if the validation fails.
    event.stopPropagation();
    form.classList.add('was-validated');
    return false;
  }
  return true;
};
