async function loadTournament() {
  const tournament_pill = document.querySelector('#v-pills-tournament');
  const content = document.createElement('div');
  content.id = 'tournamentDiv';
  content.className = 'col-sm-12';
  content.innerHTML = `
  <div class="container" id="toursListDiv">
    <table class="table table-bordered">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">Status</th>
          <th scope="col">Players</th>
          <th scope="col">Organisator</th>
          <th scope="col">Winner</th>
          <th scope="col">Action</th>
          <th scope="col">Detail</th>
        </tr>
      </thead>
      <tbody id="tours_body">
        <tr>
          <th class="tourId" scope="row">Nothing to display</th>
        </tr>
      </tbody>
    </table>
    <p id="joinError" class="text-danger"></p>
    <p id="joinOK" class="text-success"></p>
    <button type="submit" id="createTourButton" class="btn btn-primary">Create a tournament</button>
    <!-- <button type="submit" id="displayToursButton" class="btn btn-primary">Tournament list</button>-->
  </div>
  `;
  tournament_pill.appendChild(content);
  await getWhoamiid();

  document.querySelector('#createTourButton').addEventListener("click", handleCreateTourButton);
  fetchTournaments();
};

async function reloadTournament() {
  const divToDelete = document.querySelector('#tournamentDiv');
  divToDelete.remove();
  await loadTournament();
};

function handleCreateTourButton(event) {
  event.preventDefault();
  let createTourForm = document.querySelector('#tournamentDiv');
  createTourForm.innerHTML = `
        <div id="tourformDiv" >
            <h4>Create a tournament</h4>
            <form id="tourForm" class="needs-validation" novalidate>
              <div class="form-floating mb-3">
                  <input id="name" type="text" class="form-control" placeholder="name" aria-label="name" name="name" maxlength="40" pattern="[a-zA-Z0-9 ]*" required>
                  <label for="name" class="form-label">Name</label>
                  <div class="valid-feedback">
                    Looks good !
                  </div>
                  <div class="invalid-feedback">
                    Please enter the tournament name, max 40 aphanumerics characters
                  </div>
              </div>
              <div class="form-floating mb-3">
                <select class="form-select" aria-label="nb_player" name="nb_player" required>
                  <option value="">Open this select menu</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="16">16</option>
                </select>
              </div>
              <p id="saveTourError" class="text-danger"></p>
              <button id="saveTourButton" type="submit" class="btn btn-primary">Save</button>
              <button id="cancelNewTour" type="button" class="btn btn-secondary">Cancel</button>
            </form>
        </div>
    `;

  document.querySelector('#tourForm').addEventListener("submit", handleSaveNewTour);
  document.querySelector('#cancelNewTour').addEventListener("click", handleCancelCreateTourButton);
};

//function for event Listener on click on saveTourbutton
async function handleSaveNewTour(event) {
  event.preventDefault();
  const saveTourResponse = document.querySelector('#saveTourError');
  saveTourResponse.textContent = ""; //textContent better as innerHTML for text
  const theForm = event.target

  if (validSubmit(event)) {
    let unique = await checkUniqueTourName(theForm.elements['name'].value)
    
    if (unique === 'OK') {
      const form = new FormData(theForm);
      form.append("org_id", parseInt(document.querySelector('#curr_id').getAttribute('value')));

      const request = new Request(
        "api/tour/", {
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
          console.error(`Fetch problem: ${err.message}`)

        });
      await reloadTournament();
    }
    else {
      if (theForm.classList.contains('was-validated'))
        theForm.classList.remove('was-validated');
      if (unique === 'Error')
        saveTourResponse.textContent = unique;
      else
        saveTourResponse.textContent = unique + ' is already registered !';
    };
  }
};

async function handleCancelCreateTourButton() {
  document.querySelector('#cancelNewTour').removeEventListener("click", handleCancelCreateTourButton);
  document.querySelector('#tourForm').removeEventListener("submit", handleSaveNewTour);
  document.querySelector('#tourformDiv').remove();
  await reloadTournament();
};

async function fetchTournaments() {
  const url = "api/tour/";
  try {
    await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP error: ${response.status}');
        }
        return response.json();
      })
      .then(json => displayTours(json))
  }
  catch (error) {
    console.error("Fetch error", error);
  }
};

function displayTours(tours) {
  
  let tableData = "";
  tours.map((values) => {
    tableData += `<tr>
    <th class="tourId" scope="row">${values.tour_id}</th>
    <td>${values.name}</td>
    <td>${values.status}</td>
    <td>${values.nb_player}</td> 
    <td>${values.org_alias}</td>
    <td>${values.winner_alias}</td>`;

    if (values.status == 'waiting') {
      tableData += `
      <td> <button type="button" class="btn btn-primary btn-sm" id="tourJoin" value=${values.tour_id}>Join</button></td>`;
    }
    else
      tableData += `<td></td>`;
    tableData += `<td> <button type="button" class="btn btn-primary btn-sm" id="detailTour" 
      value=${values.tour_id}>Detail</button></td>
      </tr>
      `;
  });
  document.querySelector('#tours_body').innerHTML = tableData;

  document.querySelectorAll("#tourJoin").forEach(element => {
    element.addEventListener("click", handleJoinButtonList);
  });
  document.querySelectorAll("#detailTour").forEach(element => {
    element.addEventListener("click", handleShowDetailButton);
  });
};

async function handleJoinButtonList(event) {
  event.preventDefault();
  curr_user = document.querySelector('#curr_id').getAttribute('value')
  let params = { player: curr_user, tournament: this.getAttribute('value') };
  // let result = await saveJoin(params);
  let feedback = await saveJoin(params);
  await fetchTournaments();
  // return result;  joinError
  if (feedback != "OK") {
    document.querySelector('#joinError').textContent = "Join failed, too late or already registered";
    document.querySelector('#joinOK').textContent = "";
  }
  else {
    document.querySelector('#joinOK').textContent = "Join successful";
    document.querySelector('#joinError').textContent = "";
  };
};

async function handleJoinButtonDetail(event) {
  event.preventDefault();
  let feedback;
  const tour = this.getAttribute('tour');

  curr_user = document.querySelector("#curr_id").getAttribute("value");
  if (this.getAttribute('action') == "D")
    feedback = await deleteRegistration(this.getAttribute('value'));
  else {
    let params = { player: curr_user, tournament: tour };
    feedback = await saveJoin(params);
  }
  await showDetail(tour);
  console.log(feedback)
  if (feedback != "OK") {
    document.querySelector('#joinErrorDetail').textContent = "Action failed, too late or already registered";
    document.querySelector('#joinOKDetail').textContent = "";
  }
  else {
    document.querySelector('#joinOKDetail').textContent = "Action successful";
    document.querySelector('#joinErrorDetail').textContent = "";
  };
  // feedback
};

async function saveJoin(params) {
  let feedback = ""
  const hidden_form = document.createElement('form');
  hidden_form.setAttribute("id", "hiddenForm")
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hidden_input = document.createElement('input');
      hidden_input.type = 'hidden';
      hidden_input.name = key;
      hidden_input.value = params[key];

      hidden_form.appendChild(hidden_input);
    }
  }

  document.body.appendChild(hidden_form);

  const form = new FormData(document.querySelector("#hiddenForm"));
  const request = new Request(
    "/api/tourPlayer/", {
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
      feedback = "OK";
      return (response.json());
    })
    .catch((err) => {
      console.error(`Fetch problem: ${err.message}`);

    })
  document.body.removeChild(hidden_form);
  return feedback;
};

async function deleteRegistration(idToDelete) {
  let feedback = "OK"
  const request = new Request(
    "/api/tourPlayer/" + idToDelete, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
    credentials: "same-origin"
  });
  try {
    await fetch(request)
      .then((response) => {
        if (!response.ok) {
          feedback = "";
          throw new Error(`HTTP error: ${response.status}`);
        }
        // return response.json(); // source of error !!!
      })
  }
  catch (err) {
    console.error(`Delete registration problem: ${err.message}`);
  };
  return feedback;
};




async function handleShowDetailButton(event) {
  event.preventDefault();
  const tour = this.getAttribute('value');
  await showDetail(tour);
}

async function showDetail(tour) {
  const urlTour = "api/tour/" + tour;
  let div_parent = document.querySelector('#tournamentDiv');
  await fetch(urlTour)
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP error: ${response.status}');
      }
      return response.json();
    })
    .then(json => {
      displayTournamentDetail(div_parent, json, tour)
    })
    .catch((err) => {
      console.error(`Fetch problem: ${err.message}`);

    });

  const urlPlayer = "api/oneTourPlayer/" + tour;
  await fetch(urlPlayer)
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP error: ${response.status}');
      }
      return response.json();
    })
    .then(json => displayTourPlayerList(div_parent, json, tour)
    )
    .catch((err) => {
      console.error(`Fetch problem: ${err.message}`);

    });


  const urlGame = "api/oneTourGame/" + tour;
  await fetch(urlGame)
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP error: ${response.status}');
      }
      return response.json();
    })
    .then(json => displayTourGamesList(div_parent, json)
    )
    .catch((err) => {
      console.error(`Fetch problem: ${err.message}`);

    });
  let tourStatus = document.querySelector('#tourStatus').textContent;
  let detailJoinButton = document.querySelector("#tourJoinDetail")
  if (tourStatus != 'Status : waiting')
    detailJoinButton.style.display = 'none';
  else
    detailJoinButton.addEventListener("click", handleJoinButtonDetail);
  document.querySelector('#closeDetail').addEventListener("click", reloadTournament);
};

function displayTournamentDetail(div_parent, data) {
  
  div_parent.innerHTML = `
    <div class="" id="tourformDiv">
      <div class="row">
        <div class="col-sm">
          <h4>Tournament #${data.tour_id} detail</h4>
        </div>
        <div class="col-sm">
        <button id="closeDetail" type="submit" class="btn btn-secondary float-end">Close</button>
        </div>
      </div>
      
      <ul class="tour_detail">
        <li class="list-group-item">Organisator : ${data.org_alias}</li>
        <li class="list-group-item">Name : ${data.name}</li>
        <li class="list-group-item">Players : ${data.nb_player}</li>
        <li class="list-group-item" id="tourStatus">Status : ${data.status}</li>
      </ul>
    </div>
      <div class="col-sm-6" id="playerListDiv">
        <h4>Players list</h4>
    `;
};

function displayTourPlayerList(div_parent, data, curr_tour) {
  
  let curr_user = document.querySelector('#curr_id').getAttribute('value')
  let curr_joined = 0;
  
  let playerList = '<ol class="list-group">';
  if (Object.keys(data).length == 0)
    playerList += `No registered players`
  else {
    data.map((values) => {
      playerList += `
      <li class="list-group-item">${values.player_alias}</li>
      `;
      if (curr_user == values.player)
        curr_joined = values.id;
    });
  }
  if (curr_joined > 0)
  
    playerList += `<li class="btn btn-primary btn-sm" id="tourJoinDetail" 
       action="D" value=${curr_joined} tour=${curr_tour} >Delete my registration</li>
       </ol>`;
  else
    playerList += `<li class="btn btn-primary btn-sm" id="tourJoinDetail" 
      action="J" tour=${curr_tour}>Join this tournament</li>
      </ol>`;

  playerList += `</ol>
  <p id="joinErrorDetail" class="text-danger"></p>
  <p id="joinOKDetail" class="text-success"></p>
    </div> 
    <div class="col-sm-6 mt-2" id="gamesListDiv">
    <h1>Games list</h1>
    `;
  div_parent.innerHTML += playerList;
};

function displayTourGamesList(div_parent, data) {
  
  let gamesList = ``;
  
  if (Object.keys(data).length == 0)
    gamesList = `No game to display`;
  else {
    let curr_round = data[0].round
    let gap;
    let sliceStart = 0;
    let sliceEnd = (Object.keys(data).length + 1) / 2;
    gamesList = ` <article id="containerTour">
    `;
    
    switch (curr_round) {
      case 5:
        gamesList = addRound5(gamesList, data.slice(sliceStart, sliceEnd));
        gap = (sliceEnd - sliceStart) / 2;
        sliceStart = sliceEnd;
        sliceEnd = sliceEnd + gap;
      case 4:
        gamesList = addRound4(gamesList, data.slice(sliceStart, sliceEnd));
        gap = (sliceEnd - sliceStart) / 2;
        sliceStart = sliceEnd;
        sliceEnd = sliceEnd + gap;
      case 3:
        gamesList = addRound3(gamesList, data.slice(sliceStart, sliceEnd));
        gap = (sliceEnd - sliceStart) / 2;
        sliceStart = sliceEnd;
        sliceEnd = sliceEnd + gap;
      case 2:
        gamesList = addRound2(gamesList, data.slice(sliceStart, sliceEnd));
        gap = (sliceEnd - sliceStart) / 2;
        sliceStart = sliceEnd;
        sliceEnd = sliceEnd + gap;
      case 1:
        gamesList = addRound1(gamesList, data.slice(sliceStart, sliceEnd));
    }
  }
  
  div_parent.innerHTML += gamesList;
};

function addRound1(gamesList, data) {
  
  gamesList += ` <section><h5>Final</h5>`;
  data.map((values) => {
    let pl1Score = values.player1_score == null ? "" : (" - " + values.player1_score);
    let pl2Score = values.player2_score == null ? "" : (" - " + values.player2_score);
    alias1 = values.player1_detail ? values.player1_detail.alias : '---';
    alias2 = values.player2_detail ? values.player2_detail.alias : '---';
    winner = values.winner_detail ? values.winner_detail.alias : '---';
    gamesList += `
      <div class="ttplayer bg-info border border-dark" style="min-height:30px">
        ${alias1}${pl1Score}</div>
      <div class="ttplayer bg-info border border-dark" style="min-height:30px ">
      ${alias2} ${pl2Score}</div>
      </section>
      <section>
      <h5>Winner</h5>
      <div class="ttplayer bg-success border border-dark" style="min-height:30px">${winner}</div>
      </section>
      `;
  });
  gamesList += `</section>`;
  return gamesList;
};

function addRound2(gamesList, data) {
  
  gamesList += ` <section><h5>Semi final</h5>`;
  data.map((values) => {
    let pl1Score = values.player1_score == null ? "" : (" - " + values.player1_score);
    let pl2Score = values.player2_score == null ? "" : (" - " + values.player2_score);
    alias1 = values.player1_detail ? values.player1_detail.alias : '---';
    alias2 = values.player2_detail ? values.player2_detail.alias : '---';
    gamesList += `
      <div class="bg-danger border border-dark" style="min-height:30px ">
       ${alias1} ${pl1Score}</div>
      <div class="bg-danger border border-dark" style="min-height:30px ">
       ${alias2} ${pl2Score}</div>
      `;
  });
  gamesList += `</section>`;
  return gamesList;
};

function addRound3(gamesList, data) {
  
  gamesList += `<section><h5>Quarter final</h5> `;
  data.map((values) => {
    let pl1Score = values.player1_score == null ? "" : (" - " + values.player1_score);
    let pl2Score = values.player2_score == null ? "" : (" - " + values.player2_score);
    alias1 = values.player1_detail ? values.player1_detail.alias : '---';
    alias2 = values.player2_detail ? values.player2_detail.alias : '---';
    gamesList += `
      <div class="bg-secondary border border-dark" style="min-height:30px">
       ${alias1} ${pl1Score}</div>
      <div class="bg-secondary border border-dark" style="min-height:30px">
       ${alias2} ${pl2Score}</div>
      `;
  });
  gamesList += `</section>`;
  return gamesList;
};

function addRound4(gamesList, data) {
  
  gamesList += ` <section><h5>1/8</h5>`;
  data.map((values) => {
    let pl1Score = values.player1_score == null ? "" : (" - " + values.player1_score);
    let pl2Score = values.player2_score == null ? "" : (" - " + values.player2_score);
    alias1 = values.player1_detail ? values.player1_detail.alias : '---';
    alias2 = values.player2_detail ? values.player2_detail.alias : '---';
    gamesList += `
      <div class="bg-primary border border-dark" style="min-height:30px">
       ${alias1} ${pl1Score}</div>
      <div class="bg-primary border border-dark" style="min-height:30px">
       ${alias2} ${pl2Score}</div>
      `;
  });
  gamesList += `</section>`;
  return gamesList;
};

function addRound5(gamesList, data) {
  
  gamesList += ` <section><h5>1/16</h5>`;
  data.map((values) => {
    let pl1Score = values.player1_score == null ? "" : (" - " + values.player1_score);
    let pl2Score = values.player2_score == null ? "" : (" - " + values.player2_score);
    alias1 = values.player1_detail ? values.player1_detail.alias : '---';
    alias2 = values.player2_detail ? values.player2_detail.alias : '---';
    gamesList += `
      <div class="bg-success border border-dark" style="min-height:30px">
       ${alias1} ${pl1Score}</div>
      <div class="bg-success border border-dark" style="min-height:30px">
       ${alias2} ${pl2Score}</div>
      `;
  });
  gamesList += `</section>`;
  return gamesList;
};

async function handleCloseDetailButton(event) {
  event.preventDefault();
  await reloadTournament();
};

async function checkUniqueTourName(newName) {
  let myRep = 'OK';
  let nameFound = false;;
  const url = "api/tourUnique/";
  await fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP error: ${response.status}');
      }
      return response.json();
    })
    .then(json => {
      for (item of json) {
        
        if (item.name === newName)
          nameFound = true;
      };
      myRep = 'OK';
    })
    .catch((err) => {
      console.error(`Unique problem: ${err.message}`)
      myRep = 'Error'
      return myRep;
    });

  if (nameFound)
    myRep = 'Tournament name';

  return myRep;
};
