// The function to display the profile's form.
function loadProfile() {
    const profile_pill = document.querySelector('#v-pills-profile');
	const content = document.createElement('div');
	content.id = 'updateProfileDiv';

	const url = "users/myUserProfile/";
	fetch(url)
	.then((response) => {
	  if (!response.ok) {
		throw new Error('HTTP error: ${response.status}');
	  }
	  return response.json();
	})
	.then(data => {

	content.innerHTML = `
	<form id="updateForm" class="needs-validation" novalidate>

			<div class="form-floating mb-3">
				<input id="alias" type="text" class="form-control" placeholder="Alias" aria-label="alias" name="alias" value=${data.alias} maxlength="10" pattern="[a-zA-Z0-9]+" required>
				<label for="alias" class="form-label">Alias</label>
				<div class="valid-feedback">Looks good !</div>
				<div class="invalid-feedback">Please enter your Alias, only 10 alphanumerical characters</div>
			</div>

		<div class="form-floating mb-3">
			<input id="avatar" type="file" class="form-control" placeholder="avatar" aria-label="avatar" name="avatar" accept="image/png" >
			<!-- <input id="avatarHidden" type="hidden" name="avatar" value="${data.avatar}"> -->
			<label for="avatar" class="form-label">Upload Avatar</label>
			<div id="avatarValidFeedback" class="valid-feedback">Looks good !</div>
			<div id="avatarInvalidFeedback" class="invalid-feedback">Please select a PNG image for your avatar with a size less than 1 MB.</div>
		</div>

		<div class="form-floating mb-3">
			<input id="oldPassword" type="Password" class="form-control" placeholder="oldPassword" name="oldPassword">
			<label for="oldPassword" class="form-label">oldPassword</label>
			<div class="valid-feedback">Looks good !</div>
			<div class="invalid-feedback">Please enter your Password</div>
		</div>

		<p id="loginError" class="text-danger"></p>

		<div class="form-floating mb-3">
			<input id="newPassword" type="Password" class="form-control" placeholder="Password" name="password">
			<label for="newPassword" class="form-label">Password</label>
			<div class="valid-feedback">Looks good !</div>
			<div class="invalid-feedback">Please enter your Password</div>
        </div>

		<div class="form-floating mb-3">
			<input id="secondPassword" type="Password" class="form-control" placeholder="RepeatPassword" name="Repeatpassword">
			<label for="secondPassword" class="form-label">Repeat Password</label>
			<div class="valid-feedback">Looks good !</div>
		    <div class="invalid-feedback">Please enter again your Password</div>
		</div>

	<p id="signUpError" class="text-danger"></p>
	<button id="updateButton" type="submit" class="btn btn-primary">Update</button>
	</form>


	`

    profile_pill.appendChild(content);

    document.querySelector("#updateForm").addEventListener("submit", updateFormSubmit); //handleUpdateFormSubmit

	})
	.catch((err) => {
		console.error(`Fetch problem: ${err.message}`);

	});

}

function updateFormSubmit(event){
    event.preventDefault();
	const loginResponse = document.querySelector('#loginError');
	duplicatePassword = document.querySelector('#secondPassword').value;
	let signUpResponse = document.querySelector('#signUpError');
	signUpResponse.textContent = "";
	const theForm = event.target;

    if (validSubmit(event)){
        const avatarInput = document.getElementById("avatar");
		if (theForm.classList.contains('was-validated')){
			theForm.classList.remove('was-validated');
		}
        if (avatarInput.files[0]){
			// Check if avatar file size and type are valid
			const file = avatarInput.files[0];
			const fileSize = file.size / 1024 / 1024; // in MB
			const fileType = file.type;

			if (!fileType.startsWith("image/png") || fileSize > 1) {
			signUpResponse.textContent = "Please select a PNG image for your avatar with a size less than 1 MB.";
			return;
			}
		}
		const form = new FormData(theForm);
			const request = new Request(
				"/users/myUserProfile/", {
				method: 'PUT',
				headers: {
					'X-CSRFToken': localStorage.getItem("csrftoken"),
				  },
				credentials: "same-origin",
				body: form
			  });
			fetch(request)
			.then((response) => {
				if (!response.ok) {
					return response.json().then(text => { throw new Error(text.error); })
				}
				return (response.json());
			})
			.catch((err) => {
				if (theForm.classList.contains('was-validated')){
					theForm.classList.remove('was-validated');
				}
				signUpResponse.textContent = err.message;
		  });
    }
}


function handleUpdateFormSubmit(event){
	event.preventDefault();
	const loginResponse = document.querySelector('#loginError');

	duplicatePassword = document.querySelector('#secondPassword').value;
	let signUpResponse = document.querySelector('#signUpError');
	signUpResponse.textContent = ""; //textContent better as innerHTML for text
	const theForm = event.target;

	if (validSubmit(event)){
		// avatar...
        const userData = {
            alias: theForm.elements['alias'].value,
        };
		const avatarInput = document.getElementById("avatar");
       
		if (avatarInput.files[0]){
			// Check if avatar file size and type are valid
			const file = avatarInput.files[0];
			const fileSize = file.size / 1024 / 1024; // in MB
			const fileType = file.type;

			if (!fileType.startsWith("image/png") || fileSize > 1) {
			signUpResponse.textContent = "Please select a PNG image for your avatar with a size less than 1 MB.";
			return;
			}
		}

		// password ...
		if (theForm.elements['oldPassword'].value == "" && theForm.elements['newPassword'].value== ""
		&& theForm.elements['secondPassword'].value == "") {
			// third case, empty password -> ok
			
            const form = new FormData(theForm);

			const requestPWVoid = new Request(
				"/users/myUserProfile/", {
				method: 'PUT',
				headers: {
                    'X-CSRFToken': localStorage.getItem("csrftoken"),
                    //'Content-Type': 'application/json'
                  },
				// mode: 'same-origin', // Do not send CSRF token to another domain.
				credentials: "same-origin",
				body: form //JSON.stringify(userData)
			  });
			fetch(requestPWVoid)
			.then((response) => {
				if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`); // ORIGINAL
				}
				return (response.json());
		    })
		    .catch((err) => {
			if (theForm.classList.contains('was-validated'))
			  theForm.classList.remove('was-validated');
			signUpResponse = 'Registration failed';
		  });
		} else if (theForm.elements['oldPassword'].value != "" && theForm.elements['newPassword'].value != ""
		&& theForm.elements['secondPassword'].value == theForm.elements['newPassword'].value){
            const loginResponse = document.querySelector('#loginError');
            loginResponse.textContent = ""; //textContent better as innerHTML for text
            const theForm = event.target;

            if (validSubmit(event)){
                const loginButton = document.querySelector("#loginButton");
                const CreateNewAccountButton = document.querySelector("#CreateNewAccountButton");
                const loginFormDiv = document.querySelector("#loginFormDiv");

                const form = new FormData(theForm);

                const request = new Request(
                    "/apiauth/login/", {
                    method: 'POST',
                    headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
                    credentials: "same-origin",
                    body: form,
                  });
                  fetch(request) // the first password (old one) pris de handleLoginFormSubmit
                    .then((response) => {
                        if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                        }
                        return (response.json());
                    })
                    .then(jsonData => {
                        if (jsonData.detail === "Successfully logged in.") {
                          document.querySelector("#loginForm").reset();
                          loginButton.removeEventListener("click", handleLoginFormSubmit);
                          CreateNewAccountButton.removeEventListener("click", handleCreateNewAccountClick);
                          loginFormDiv.remove();
                          localStorage.setItem("session", "true");
                          getCsrfToken();
                          getWhoami();
                          getWhoamiid();
                        }
                      })
                      .catch((err) => {
                        if (theForm.classList.contains('was-validated'))
                          theForm.classList.remove('was-validated');
						// Test for error 400 or other error?
                        if (err.message.includes('400'))
                          loginResponse.textContent = "Invalid credentials";
                        else
                          loginResponse.textContent = "Error login";
                      });
                      
            }


            const form = new FormData(theForm);
            
        }
	};
}


function createLoginForm() {
  const profile_pill = document.querySelector('#v-pills-profile');
  const content = document.createElement('div');

  content.id = 'loginFormDiv';
  content.innerHTML = `
	<form id="loginForm" class="needs-validation" novalidate>

	  <div class="form-floating mb-3">
		<input id="username" type="text" class="form-control" placeholder="Username" aria-label="Username" name="username" pattern="[a-zA-Z0-9]+" required>
		<label for="username" class="form-label">Username</label>
		<div class="valid-feedback">
		  Looks good !
		</div>
		<div class="invalid-feedback">
		  Please enter your Username
		</div>
	  </div>

	  <div class="form-floating mb-3">
		<input id="password" type="password" class="form-control" placeholder="Password" name="password" required>
		<label for="password" class="form-label">Password</label>
		<div class="valid-feedback">
		  Looks good !
		</div>
		<div class="invalid-feedback">
		  Please enter your Password
		</div>
	  </div>
	  <p id="loginError" class="text-danger"></p>

	  <button id="loginButton" type="submit" class="btn btn-primary">Sign in</button>

	</form>
	<button style="margin-top:5px;" id="CreateNewAccountButton" type="submit" class="btn btn-primary">Create new account</button>
  `;
  profile_pill.appendChild(content);

  document.querySelector("#loginForm").addEventListener("submit", handleLoginFormSubmit);
  document.querySelector("#CreateNewAccountButton").addEventListener("click", handleCreateNewAccountClick);
}

function handleLoginFormSubmit(event) {
  event.preventDefault();
  const loginResponse = document.querySelector('#loginError');
  loginResponse.textContent = ""; //textContent better as innerHTML for text
  const theForm = event.target;
  if (validSubmit(event)) {

	const loginButton = document.querySelector("#loginButton");
	const CreateNewAccountButton = document.querySelector("#CreateNewAccountButton");
	const loginFormDiv = document.querySelector("#loginFormDiv");

	const form = new FormData(theForm);

	const request = new Request(
	  "/apiauth/login/", {
	  method: 'POST',
	  headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
	  // mode: 'same-origin', // Do not send CSRF token to another domain.
	  credentials: "same-origin",
	  body: form,
	});
	fetch(request)
	  .then((response) => {
		if (!response.ok) {
		  throw new Error(`HTTP error: ${response.status}`);
		}
		return (response.json());
	  })
	  .then(jsonData => {
		if (jsonData.detail === "Successfully logged in.") {
		  document.querySelector("#loginForm").reset();  // Restore the form element's default values.
		  loginButton.removeEventListener("click", handleLoginFormSubmit);
		  CreateNewAccountButton.removeEventListener("click", handleCreateNewAccountClick);
		  loginFormDiv.remove();
		  // createLogoutButton();
		  localStorage.setItem("session", "true");
		  getCsrfToken();
		  // enableTabs();
		  getWhoami();
		  getWhoamiid();
		  history.pushState("/lobby", '', "/lobby")
		  lobby();	
		}
	  })
	  .catch((err) => {
		if (theForm.classList.contains('was-validated'))
		  theForm.classList.remove('was-validated');
		// Test for error 400 or other error?
		if (err.message.includes('400'))
		  loginResponse.textContent = "Invalid credentials";
		else
		  loginResponse.textContent = "Error login";
	  });
  }
};

function handleCreateNewAccountClick(event) {
  event.preventDefault();

  document.querySelector("#CreateNewAccountButton").removeEventListener("click", handleCreateNewAccountClick);
  document.querySelector("#loginFormDiv").remove();

  const profile_pill = document.querySelector('#v-pills-profile');
  const content = document.createElement('div');
  content.id = 'createNewAccountDiv';
  content.innerHTML = `
  <h3>Create new account</h3> <!-- Put this outside of the form tag. -->
  <form id="signUpForm" class="needs-validation" novalidate action="/handle_avatar_upload/" method="post" enctype="multipart/form-data">

  		  <div class="form-floating mb-3">
	  		<input id="newUsername" type="text" class="form-control" placeholder="Username" aria-label="Username"
		  	name="username" maxlength="100" pattern="[a-zA-Z0-9]+" required>
	  		<label for="newUsername" class="form-label">Username</label>
			<div class="valid-feedback">Looks good !</div>
			<div class="invalid-feedback">Please enter your Username, only alphanumerical characters</div>
		  </div>

	  	  <div class="form-floating mb-3">
			<input id="newPassword" type="password" class="form-control" placeholder="Password" name="password" required>
			<label for="newPassword" class="form-label">Password</label>
			<div class="valid-feedback">Looks good !</div>
			<div class="invalid-feedback">Please enter your Password</div>
		  </div>

		  <div class="form-floating mb-3">
			  <input id="secondPassword" type="password" class="form-control" placeholder="Repeat Password" required>
			  <label for="secondPassword" class="form-label">Repeat Password</label>
			  <div class="valid-feedback">Looks good !</div>
			  <div class="invalid-feedback">Please enter again your Password</div>
		  </div>

		  <div class="form-floating mb-3">
			  <input id="newAlias" type="text" class="form-control" placeholder="alias" name="alias" maxlength="10" pattern="[a-zA-Z0-9]+" required>
			  <label for="newAlias" class="form-label">Alias</label>
			  <div class="valid-feedback">Looks good !</div>
			  <div class="invalid-feedback">Please enter your Alias, only 10 alphanumerical characters</div>
		  </div>

		  <div class="form-floating mb-3">
			<input id="avatar" type="file" class="form-control" placeholder="avatar" aria-label="avatar" name="avatar" accept="image/png" >
			<label for="avatar" class="form-label">Upload Avatar</label>
			<div id="avatarValidFeedback" class="valid-feedback">Looks good !</div>
			<div id="avatarInvalidFeedback" class="invalid-feedback">Please select a PNG image for your avatar with a size less than 1 MB.</div>
	  	  </div>

		  <p id="signUpError" class="text-danger"></p>
		  <div style="display:inline-block;">
			  <button id="signUpButton" type="submit" class="btn btn-primary" style="margin-right: 10px;">Sign up</button>
			  <button id="cancelButton" type="button" class="btn btn-primary">Cancel</button>
		  </div>

</form>
<img id="avatar-preview" src="/media/default_avatar.png" alt="Default Avatar" style="max-width: 100px; max-height: 100px;">
	`;
  profile_pill.appendChild(content);

  document.querySelector('#signUpForm').addEventListener("submit", handleSignUpFormSubmit);
  document.querySelector('#cancelButton').addEventListener("click", cancelButtonClick);
  // for avatar
  document.querySelector('#avatar').addEventListener("change", validateAvatar);
}

function cancelButtonClick() {
  document.querySelector('#cancelButton').removeEventListener("click", cancelButtonClick);
  document.querySelector("#signUpForm").removeEventListener("submit", handleSignUpFormSubmit);
  document.querySelector('#createNewAccountDiv').remove();
  createLoginForm();
};

async function handleSignUpFormSubmit(event) {
  event.preventDefault();
  duplicatePassword = document.querySelector('#secondPassword').value;
  let signUpResponse = document.querySelector('#signUpError');
  signUpResponse.textContent = ""; //textContent better as innerHTML for text
  // const theForm = document.querySelector("#signUpForm"); // ORIGINAL
  const theForm = event.target;

  if (validSubmit(event)) {
	
		const avatarInput = document.getElementById("avatar");
		
		if (avatarInput.files[0]){
			
			// Check if avatar file size and type are valid
			const file = avatarInput.files[0];
			const fileSize = file.size / 1024 / 1024; // in MB
			const fileType = file.type;

			if (!fileType.startsWith("image/png") || fileSize > 1) {
			signUpResponse.textContent = "Please select a PNG image for your avatar with a size less than 1 MB.";
			return;
			}
		}
	// end test avatar
	//if (unique === 'OK') {
	  if (theForm.elements['newPassword'].value !== duplicatePassword)
		signUpResponse.textContent = "Duplicate password do not match";
	  else {
		const form = new FormData(theForm);

		const request = new Request(
		  "/apiauth/sign_up/", {
		  method: 'POST',
		  headers: { 'X-CSRFToken': localStorage.getItem("csrftoken") },
		  // mode: 'same-origin', // Do not send CSRF token to another domain.
		  credentials: "same-origin",
		  body: form,
		});
		fetch(request)
		  .then((response) => {
			// detailResponse = response.detail;Error: undefined
			if (!response.ok) {
			  // signUpResponse.textContent = response.json.detail; Error: undefined
			  return response.json().then(text => { throw new Error(text.detail); })
            //  throw new Error(`HTTP error: ${response.json().error}`); // ORIGINAL
			}
			return (response.json());
		  })
		  .then(jsonData => {
			if (jsonData.detail === "Successfully signed up.") {
			  document.querySelector("#cancelButton").removeEventListener("click", cancelButtonClick);
			  document.querySelector("#signUpForm").removeEventListener("submit", handleSignUpFormSubmit);
			  document.querySelector('#createNewAccountDiv').remove();
			  createLoginForm();
			}
		  })
		  .catch((err) => {
			if (theForm.classList.contains('was-validated')){
			  theForm.classList.remove('was-validated');
            }
            signUpResponse.textContent = err.message
		  });
	  }
	
  }
};


// avatar ...
function validateAvatar() {
  const avatarInput = document.querySelector("#avatar");
  const avatarValidFeedback = document.querySelector("#avatarValidFeedback");
  const avatarInvalidFeedback = document.querySelector("#avatarInvalidFeedback");

  const file = avatarInput.files[0];
	
  if (!file){
	  avatarPreview.src = "media/avatars/default_avatar.png";
	  avatarInput.setCustomValidity("");
	  avatarInput.classList.remove("is-invalid");
	  avatarInput.classList.add("is-valid");
	  avatarInvalidFeedback.style.display = "none";
	  avatarValidFeedback.style.display = "block";
	  return; // Exit the function
	}

const fileSize = file.size / 1024 /1024; // in MB
const fileType = file.type;

if (!fileType.startsWith("image/png") || fileSize > 5){
	avatarInput.setCustomValidity("");
	avatarInput.classList.add("is-invalid");
	avatarInvalidFeedback.style.display = "block";
	avatarValidFeedback.style.display = "none";
	} else {
	avatarInput.setCustomValidity("");
	avatarInput.classList.remove("is-invalid");
	avatarInput.classList.add("is-valid");
	avatarInvalidFeedback.style.display = "none";
	avatarValidFeedback.style.display = "block";
	}
};
