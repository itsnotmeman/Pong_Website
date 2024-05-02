const protocol = window.location.protocol;
const host = window.location.host;
const baseURL = `${protocol}//${host}`;

function loadLobby() {
    const lobby_pill = document.querySelector('#v-pills-games');
    const content = document.createElement('div');
    content.id = 'lobbyDiv';
    content.innerHTML = `
    <div class="row">
        <div class="col-md-3">
            <!-- Game Creation Form -->
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Create Game</h5>
                    <form id="createGameForm">
                        <div class="mb-3">
                            <label for="gameNameInput" class="form-label">Game Name:</label>
                            <input type="text" class="form-control" id="gameNameInput" placeholder="Enter game name" required>
                        </div>
                        <div style="display:none" class="mb-3">
                            <label for="gameTypeSelect" class="form-label">Game Type:</label>
                            <select class="form-select" id="gameTypeSelect">
                                <!-- Game types will be added here by JavaScript -->
                            </select>
                        </div>
                        <div style="display:none" class="mb-3">
                            <label for="gamePasswordInput" class="form-label">Password (optional):</label>
                            <input type="password" class="form-control" id="gamePasswordInput" placeholder="Password for private game">
                        </div>
                        <button type="submit" class="btn btn-primary" id="createGameBtn">Create Game</button>
                    </form>

                    <p id="error_message"></p>
                </div>
            </div>
        </div>
        <div class="col-md-9">
            <!-- List of Available Games -->
            <div class="card" style="min-width: 600px;">
                <div class="card-header">
                <h3 class="games-title">Available games</h3>
                </div>
                <div class="table-responsive">
                    <table class="table" id="gameList">
                        <!-- The table headers and body will be dynamically generated here -->
                    </table>
                </div>
            </div>
        </div>
    </div>
`;

    lobby_pill.appendChild(content);


    // Connect to WebSocket
    const socket = new WebSocket(`wss://${host}/ws/lobby/`);

    // Connection opened
    socket.addEventListener('open', (event) => {
    });

    // Listen for messages from the WebSocket server
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        // Check if the WebSocket message is a game update
        if (data.type === 'game_update') {
            // Refresh the list of available games
            fetchAvailableGames();
        }
    });

    // Connection closed
    socket.addEventListener('close', (event) => {
    });

    document.getElementById('createGameForm').addEventListener('submit', function (event) {
        createGame(event, socket);
    });

    // Populate game type dropdown
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    const gameTypes = ['Lobby', 'Tournament'];

    gameTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        gameTypeSelect.appendChild(option);
    });

    // Call fetchAvailableGames to populate games on load
    fetchAvailableGames();

    // Retrieve the user token from cookies
    const userToken = getCookie('csrftoken');

    // Fill Name field based on user alias
    fetch(`${baseURL}/api/user_alias/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': userToken,
        },
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            const gameNameInput = document.getElementById('gameNameInput');

            if (gameNameInput) {
                const gameNameValue = data.alias + "'s Game";
                gameNameInput.value = gameNameValue;
            }
        })
        .catch(error => console.error('Error:', error));

}

function createGame(event, socket) {
    event.preventDefault();

    const gameName = document.getElementById('gameNameInput').value;
    const gameType = document.getElementById('gameTypeSelect').value;
    const csrftoken = getCookie('csrftoken');

    const gameData = {
        name: gameName,
        game_type: gameType,
        creator: 1,
    };

    fetch(`${baseURL}/api/games/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(gameData)
    })
        .then(response => response.json())
        .then(data => {
            var error_message_p = document.getElementById("error_message");
            error_message_p.innerHTML = '';

            if (data.hasOwnProperty('name') && Array.isArray(data.name)) {
                error_message_p.style.color = 'red';
                var text = document.createTextNode(`Error: ${data.name[0]}`);
                error_message_p.appendChild(text);
            } else {
                fetchAvailableGames(); // Refresh the list of games
                // Notify other clients about the new game via WebSocket
                const gameUpdateMessage = {
                    type: 'game_update',
                    message: 'New game created!',
                };
                socket.send(JSON.stringify(gameUpdateMessage));
            }
        })
        .catch(error => {
            console.error('Error creating game:', error);
        });
}

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Check if this cookie name matches the name we're looking for
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to fetch available games
function fetchAvailableGames() {
    fetch(`${baseURL}/api/games/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(gamesList => {
            updateGamesList(gamesList);
        })
        .catch(error => console.error('Error fetching games:', error));
}

function updateGamesList(gamesList) {
    const currentUserAlias = getCookie("user_alias");
    const gamesTable = document.getElementById('gameList');
    gamesTable.innerHTML = '';
    // Headers setup
    const thead = gamesTable.createTHead();
    const headerRow = thead.insertRow();
    const labels = ['Game Name', 'Type', 'Status', 'Player 1', 'Player 2', 'Score', 'Action'];

    labels.forEach(label => {
        const th = document.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
    });

    const tbody = document.createElement('tbody');
    gamesTable.appendChild(tbody);

    gamesList.forEach(game => {
        const row = tbody.insertRow();

        // Fill in the game details
        row.insertCell().textContent = game.name;
        row.insertCell().textContent = game.game_type;
        row.insertCell().textContent = game.state;

        const playerCount = (game.player1_detail ? 1 : 0) + (game.player2_detail ? 1 : 0);
        row.insertCell().textContent = game.player1_detail ? game.player1_detail.alias || '---' : '---';
        row.insertCell().textContent = game.player2_detail ? game.player2_detail.alias || '---' : '---';
        row.insertCell().textContent = game.state == 'finished' ? game.player1_score + " - " + game.player2_score : '';

        const actionCell = row.insertCell();
        const actionButton = document.createElement('button');
        actionButton.className = 'btn btn-sm';

            if (game.state === 'in_progress') {
                actionButton.textContent = 'In Progress';
                actionButton.className = 'btn btn-success';
                actionButton.disabled = true;
            } else if (game.state === 'finished') {
                actionButton.textContent = 'Finished';
                actionButton.className = 'btn btn-success';
                actionButton.disabled = true;
            } else if (game.state === 'ready') {
                // Game is ready and not started yet, show "Start Game" only if the current user is one of the players
                if (playerCount === 2 && (game.player1_detail?.alias === currentUserAlias || game.player2_detail?.alias === currentUserAlias)) {
                    actionButton.textContent = 'Start Game';
                    actionButton.className = 'btn btn-primary';
                    actionButton.addEventListener('click', () => startPong(game.id));
                }
            } else if (playerCount < 2) {
                if (game.game_type != 'Tournament') {
                    // Handle join scenario here
                    if (game.player1_detail?.alias === currentUserAlias || game.player2_detail?.alias === currentUserAlias) {
                        actionButton.textContent = 'Registered';
                        actionButton.className += ' btn-secondary';
                        actionButton.disabled = true;
                    } else {
                            actionButton.textContent = 'Join';
                            actionButton.className += ' btn-primary';
                            actionButton.addEventListener('click', () => joinGame(game.id));
                                    }
                }
            } else {
                // If none of the above, it implies the game is full and the user is not part of it
                actionButton.textContent = 'Game Full';
                actionButton.className += ' btn-secondary';
                actionButton.disabled = true;
            }

        actionCell.appendChild(actionButton);
    });
}

function joinGame(gameId) {
    const csrftoken = getCookie('csrftoken');
    const localPlayersJoining = 1;
    fetch(`${baseURL}/api/games/${gameId}/join/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({ local_players: localPlayersJoining })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        fetchAvailableGames();
    })
    .catch(error => console.error('Error joining game:', error));
}

function startPong(gameId) {
    fetch(`${baseURL}/gameapp/start_game/${gameId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': localStorage.getItem("csrftoken"),
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(text => { throw new Error(text.error) })
            }
            startButton = document.querySelector("#startLocalGameButton");
            startButton.textContent = "Game Started";
            startButton.disabled = true;
        })
        .then(data => {
            fetchAvailableGames(); // Refresh the list of games
        })
        .catch(error => {
            alert(error.message);
        });
}
