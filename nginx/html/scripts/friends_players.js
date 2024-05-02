async function loadFriendsPlayers() {
    const stats_pill = document.querySelector('#v-pills-stats');
    const content = document.createElement('div');
    content.id = 'usersDiv';
    content.className = 'col-sm-12';
    content.innerHTML = `
    <div class="card" style="min-width: 400px;">
      <div class="card-header">
       <h3>My friends</h3>
      </div>
      <div class="table-responsive">
        <table class="table" >
            <tbody id="myfriends">
              <!-- The table headers and body will be dynamically generated here -->
            </tbody>
        </table>
        <p id="FriendReqError" class="text-danger"></p>
        <div class="inline mb-2" id="addFriend">
          <button id="reqFriend" type="submit" class="btn btn-primary">Add a friend</button>
        </div>

    <div class="card" style="min-width: 400px;">
      <div class="card-header">
        <h4>Received requests</h4>
      </div>
      <div class="table-responsive">
          <table class="table" >
            <tbody id="recRequest">
              <!-- The table headers and body will be dynamically generated here -->
            </tbody>
          </table>
      </div>
    </div>
    <div class="card" style="min-width: 400px;">
      <div class="card-header">
        <h4>Sent requests</h4>
      </div>
      <div class="table-responsive">
        <table class="table" >
          <tbody id="sentRequest">
            <!-- The table headers and body will be dynamically generated here -->
          </tbody>
        </table>
      </div>
    </div>
    <div class="card" style="min-width: 400px;">
      <div class="card-header">
        <h3>Players list</h3>
      </div>
      <div class="table-responsive">
        <table class="table" >
          <tbody id="userList">
            <!-- The table headers and body will be dynamically generated here -->
          </tbody>
        </table>
    </div>
  </div>


      `;


    stats_pill.appendChild(content);
    document.querySelector('#reqFriend').addEventListener("click", handleClickAddFriend);

    await fetchListFriends();
    await fetchListUsers();
  };

async function reloadFriendsPlayers() {
  const divToDelete = document.querySelector('#usersDiv');
  divToDelete.remove();
  await loadFriendsPlayers();

}



  async function fetchListUsers() {

    const url = "users/user/";
    await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP error: ${response.status}');
        }
        return response.json();
      })
      .then(json => {
        displayUsersList(json)
      })

      .catch((err) => {
        console.error(`Fetch problem: ${err.message}`);

      });
  };


  async function fetchListFriends() {
    curr_id = await getWhoamiid();
    const url = "users/myfriend/"
    await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP error: ${response.status}');
        }
        return response.json();
      })
      .then(json => {
        displayFriendsList(json.filter(element => element.accepted == true));
        displayReceivedRequest(json.filter(element => element.accepted != true && element.recipient == curr_id.id));
        displaySentRequest(json.filter(element => element.accepted != true && element.requestor == curr_id.id));

      })
      .catch((error) => {
        console.error(`Fetch friend problem: ${err.message}`);

      });
  };

  async function displayFriendsList(data) {
    let myfriend;
    let statusFriend;
    let userId;
    let avatarPath
    let tableData = "";
    curr_id = await getWhoamiid();
    data.map((values) => {
      if (values.requestor == curr_id.id) {
        myfriend = values.aliasrec;
        statusFriend = values.statusrec;
        userId = values.recipient;
        avatarPath = "media/" + values.recAvatar;
      }
      else {
        myfriend = values.aliasreq;
        statusFriend = values.statusreq;
        userId = values.requestor;
        avatarPath = "media/" + values.reqAvatar;
      };

      tableData += `
      <tr>
        <td><img id="curr_avatar" src=${avatarPath} alt="current_avatar" class="rounded-circle me-2"
          style="width: 30px;"></td>
        <td>${myfriend}</td>
        <td>${statusFriend}</td>
        <td>
        <button type="button" class="btn btn-primary btn-sm" id="removeFriend" value=${values.friend_id}>Remove</button>
        <button type="button" class="btn btn-primary btn-sm" id="showProfile" value=${userId}>Profile</button>
        </td>
      </tr>
      `
    });
    document.querySelector('#myfriends').innerHTML = tableData;

    document.querySelectorAll("#removeFriend").forEach(element => {
      element.addEventListener("click", handleRemoveFriend);
    });
    document.querySelectorAll("#showProfile").forEach(element => {
      element.addEventListener("click", handleProfileClick);
    });
  };

  function displayReceivedRequest(data) {
    let tableData = "";
    data.map((values) => {
      reqStatus = values.accepted == false ? "rejected" : "pending";
      avatarPath = "media/" + values.reqAvatar;
      tableData += `
      <tr>
        <td><img id="curr_avatar" src=${avatarPath}  alt="current_avatar" class="rounded-circle me-2"
          style="width: 30px;"></td>
        <td>${values.aliasreq}</td>
        <td>${reqStatus}</td>
        `;
      if (reqStatus != "rejected") {
        tableData += `
          <td>
            <button type="button" class="btn btn-primary btn-sm" id="acceptRequest" value=${values.friend_id}>Accept</button>
            <button type="button" class="btn btn-primary btn-sm" id="rejectRequest" value=${values.friend_id}>Reject</button>
          </td>
          `;
      };
      tableData += `</tr>
        `;
    });
    document.querySelector('#recRequest').innerHTML = tableData;

    document.querySelectorAll("#acceptRequest").forEach(element => {
      element.addEventListener("click", handleAcceptRequest);
    });
    document.querySelectorAll("#rejectRequest").forEach(element => {
      element.addEventListener("click", handleRejectRequest);
    });
  };

  function displaySentRequest(data) {
    let tableData = "";
    data.map((values) => {
      reqStatus = values.accepted == false ? "rejected" : "pending";
      avatarPath = "media/" + values.recAvatar;
      tableData += `
      <tr>
        <td><img id="curr_avatar" src=${avatarPath}  alt="current_avatar" class="rounded-circle me-2"
          style="width: 30px;"></td>
        <td>${values.aliasrec}</td>
        <td>${reqStatus}</td>
        <td>
          <button type="button" class="btn btn-primary btn-sm" id="deleteRequest" value=${values.friend_id}>Delete</button>

        </td>
      </tr>
      `
    });
    document.querySelector('#sentRequest').innerHTML = tableData;
    document.querySelectorAll("#deleteRequest").forEach(element => {
      element.addEventListener("click", handleDeleteRequest);
    });

  };

  async function displayUsersList(data) {
    let tableData = "";

    data.map((values) => {
      tableData += `<tr>
      <td><img id="curr_avatar" src=${values.avatar} alt="current_avatar" class="rounded-circle me-2"
        style="width: 30px;"></td>
      <td>${values.alias}</td>
      <td> <button type="button" class="btn btn-primary btn-sm" id="showProfile" value=${values.id}>Profile</button></td>
      <!-- <td> <button type="button" class="btn btn-primary btn-sm" id="chatBlock" value=${values.id}>Chat block</button></td>  -->
      </tr>
      `
    });
    document.querySelector('#userList').innerHTML = tableData;
    document.querySelectorAll("#showProfile").forEach(element => {
      element.addEventListener("click", handleProfileClick);
    });
  };


  function handleClickAddFriend(event) {
    event.preventDefault;
    document.querySelector('#reqFriend').removeEventListener("click", handleClickAddFriend);
    div = document.querySelector('#addFriend');
    div.innerHTML = `
    <form id="addFriendForm" class="needs-validation" novalidate>
      <div class="form-floating mb-3">
        <input id="newFriend" type="text" class="form-control" placeholder="recipient" name="recipient" required>
        <label for="newFriend" class="form-label">New Friend</label>
      <div class="valid-feedback">
      Looks good !
      </div>
        <div class="invalid-feedback">
          Please enter your friend's alias
        </div>
      </div>
      <p id="saveFriendError" class="text-danger"></p>
      <div style="display:inline-block;">
        <button id="saveNewFriendButton" type="submit" class="btn btn-primary" style="margin-right: 10px;">Send request</button>
        <button id="cancelAddFriendButton" type="button" class="btn btn-primary">Cancel</button>
      </div>
    </form>
    `;

    document.querySelector('#addFriendForm').addEventListener("submit", handleSubmitNewFriend);
    document.querySelector('#cancelAddFriendButton').addEventListener("click", cancelAddFriendClick);
  };

  async function handleSubmitNewFriend(event) {
    event.preventDefault();
    const saveFriendResponse = document.querySelector('#saveFriendError');
    saveFriendResponse.textContent = "";
    const theForm = event.target;


    if (validSubmit(event)) {
      let unique = 'OK';// check if friend exist or request pending
      if (unique === 'OK') {
        const form = new FormData(theForm);
        const request = new Request(
          "users/friend/", {
          method: 'POST',
          headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
          credentials: "same-origin",
          body: form
        });
        await fetch(request)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            if (response.redirected) {
              window.location.href = response.url;
            }
            else {
              return (response.json());
            }
          })
          .catch((err) => {
            alert('This user does not exist or is already your friend')
            console.error(`Fetch friend problem: ${err.message}`);
          });
      };
      div = document.querySelector('#addFriend');
      div.innerHTML = `
        <button id="reqFriend" type="submit" class="btn btn-primary">Add a friend</button>
        `;
      document.querySelector('#reqFriend').addEventListener("click", handleClickAddFriend);

      await fetchListFriends();
    }
    
  };

  function cancelAddFriendClick() {
    document.querySelector('#cancelAddFriendButton').removeEventListener("click", cancelAddFriendClick);
    document.querySelector("#addFriendForm").removeEventListener("submit", handleSubmitNewFriend);
    document.querySelector('#addFriend').innerHTML = `<button id="reqFriend" type="submit" class="btn btn-primary">Add a friend</button>`;
    document.querySelector('#reqFriend').addEventListener("click", handleClickAddFriend);
    createLoginForm();
  };

   function handleRemoveFriend(event) {
    event.preventDefault;
    idToDelete = this.getAttribute('value')

    const request = new Request(
      "/users/friend/" + idToDelete, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
        credentials: "same-origin"
      });
       fetch(request)
      .then((response) => {
        if (!response.ok) {
         throw new Error(`HTTP error: ${response.status}`);
      }
    })
    .catch ((err) => {
      console.error("Delete problem:", err.message);
    })
    fetchListFriends();
  };

  async function handleAcceptRequest(event) {
    idToAccept = this.getAttribute('value')

    const request = new Request(
      "/users/friend/" + idToAccept, {
      method: 'PUT',
      headers: {
        'X-CSRFToken': localStorage.getItem("csrftoken"),
        'Content-Type': 'application/json'
      },
      credentials: "same-origin",
      body: JSON.stringify({ accepted: true })
    });
    try {
      await fetch(request)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          return (response.json());
        })
    }
    catch (error) {
      console.error("Fetch problem:", error.message);
    };
    fetchListFriends();
  };

  async function handleRejectRequest(event) {
    idToReject = this.getAttribute('value')
    const request = new Request(
      "/users/friend/" + idToReject, {
      method: 'PUT',
      headers: {
        'X-CSRFToken': localStorage.getItem("csrftoken"),
        'Content-Type': 'application/json'
      },
      credentials: "same-origin",
      body: JSON.stringify({ accepted: false })
    });
    try {
      await fetch(request)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          return (response.json());
        })
    }
    catch (error) {
      console.error("Fetch problem:", error.message);
    };
    fetchListFriends();
  };

  async function handleDeleteRequest(event) {
    idToDelete = this.getAttribute('value')
    const request = new Request(
      "/users/friend/" + idToDelete, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': localStorage.getItem("csrftoken"),
        'Content-Type': 'application/json'
      },
      credentials: "same-origin",
    });
    try {
      await fetch(request)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          return (response.json());
        })
    }
    catch (error) {
      console.error("Delete problem:", error.message);
    };
    fetchListFriends();
  };

  async function handleProfileClick(event) {
    event.preventDefault;
    idProfile = this.getAttribute('value');
    await fetchProfile(idProfile);
  };
    
  async function fetchProfile(idProfile)
  {
    const url = "users/user/" + idProfile
    await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP error: ${response.status}');
        }
        return response.json();
      })
      .then(json => {
        displayUserProfile(json);

      })
      .catch((error) => {
        console.error(`Fetch friend problem: ${error.message}`);

      });
    document.querySelector('#closeProfil').addEventListener("click", reloadFriendsPlayers);
    fetchHistory(idProfile);
  };

  function displayUserProfile(data) {

    let div_parent = document.querySelector('#usersDiv');

    div_parent.innerHTML = `
    <div id="usersProfileDiv">
      <div class="inline">
        <span><img id="curr_avatar" src=${data.avatar}  alt="current_avatar" class="rounded-circle"
          style="width: 50px;"></span>
        <span><h4>${data.alias}'s profil</h4></span>
      </div>
      <div>
      </div>
      <div>
       <button id="closeProfil" type="submit" class="btn btn-secondary float-end">Close</button>
        <span id="histCountMatch" class="list-group-item" style="max-width: 200px;">Played games : </span>
        <span id="histWonMatch" class="list-group-item" style="max-width: 200px;">Won games : </span>
        </div>
    </div>
    `;
  };


  async function fetchHistory(id) {
    const url = "users/history/" + id
    await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP error: ${response.status}');
        }
        return response.json();
      })
      .then(json => {
        displayHistory(json, id);

      })
      .catch((error) => {
        console.error(`Fetch history problem: ${error.message}`);

      });

  };

  function displayHistory(data, id) {
    document.querySelector('#histCountMatch').innerHTML += data.length;
    let countWonMatch = 0;

    const div_parent = document.querySelector('#usersDiv');
    const content = document.createElement('div');
    content.id = 'historyDiv';
    content.innerHTML = `
    <div class="row">
      <div class="col-md-9">
        <div class="card" style="min-width: 800px;">
          <div class="card-header">
            <h5 class="games-title">Played games history</h5>
          </div>
          <div class="table-responsive">
              <table class="table" id="historyList">
                  <!-- The table headers and body will be dynamically generated here -->
              </table>
          </div>
        </div>
      </div>
    </div>
    `;
    div_parent.appendChild(content);
    document.querySelector('#closeProfil').addEventListener("click", reloadFriendsPlayers);


    const historyTable = document.getElementById('historyList');
    historyTable.innerHTML = ''; // Clear existing table content

    // Headers setup
    const thead = historyTable.createTHead();
    const headerRow = thead.insertRow();
    const labels = ['Game Name', 'Type', 'Status', 'Player 1', 'Player 2', 'Score', 'Date',];

    labels.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });

    const tbody = document.createElement('tbody');
    historyTable.appendChild(tbody);

    data.forEach(game => {
      const row = tbody.insertRow();
      // Fill in the game details (assuming you have a way to check the number of players)
      row.insertCell().textContent = game.name;
      row.insertCell().textContent = game.game_type;
      row.insertCell().textContent = game.state;
      row.insertCell().textContent = game.player1_detail ? game.player1_detail.alias || game.player1_detail.name : '---';
      row.insertCell().textContent = game.player2_detail.alias ? game.player2_detail.alias || game.player2_detail.name : '---';;
      row.insertCell().textContent = game.player1_score + " - " + game.player2_score;
      const date = new Date(game.start_time);
      const formattedDateTime = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
        }).format(date);

      row.insertCell().textContent = formattedDateTime;//game.start_time;
      if (id ==  game.winner_detail.id) {
        countWonMatch++;
      }
    });

    document.querySelector('#histWonMatch').innerHTML += countWonMatch;
  };
