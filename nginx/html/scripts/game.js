

class CameraManager{
	constructor(canvas, fov, aspect, near, far, position, lookAt, up){
		this.canvas = canvas;
		this.renderer =  new THREE.WebGLRenderer( { antialias: true, canvas } );

		this.defaultCameraPosition(fov, aspect, near, far, position, lookAt, up);
		this.setupControls();
	}

	defaultCameraPosition(fov, aspect, near, far, position, lookAt, up){
		this.camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
		this.setCameraPosition({position, lookAt, up});
	}

	setCameraPosition(positionSetting){
		this.camera.position.copy(positionSetting.position);
		this.camera.lookAt(positionSetting.lookAt);
		this.camera.up.copy(positionSetting.up);
	}

	setupControls(){
		this.controls = new THREE.OrbitControls(this.camera, this.canvas);
	}

	switchToDefaultCamera() {
		this.defaultCameraPosition();
	}

	switchToTopView(){
		const topCameraPosition = {
			position: new THREE.Vector3(0, 1600,0),
			lookAt : new THREE.Vector3(0,0,0),
			up : new THREE.Vector3(0,0,1)
		};
		this.setCameraPosition(topCameraPosition);
	}
}

const scene = new THREE.Scene();
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );

const wallHeight = 20;
const wallDepth = 1;

const gameHeight = 0.1;

let rightPaddlePosition = 0;
let leftPaddlePosition = 0;
const paddleHeight = 20;
const paddleOffset = 5;
let ballXPosition = 0;
let ballYPosition = 0;

let scorePlayerMeshesReady = false;
let isGameStarted = false;
let isCountdownInitiationStarted = false;
let isCountdownStarted = false;
let isGameRunning = false;

let instructionMesh;

let startButton = document.querySelector("#startLocalGameButton");

function hasTexture(material) {
	return (material && material.map);
}

const gameScene = new THREE.Object3D();
const dynamicElementsGroup = new THREE.Group();
const gameBoard = new THREE.Group();
const floorGroup = new THREE.Group();//

const width = 1;
const height = 1;
const depth = 1;
const boxGeometry = new THREE.BoxGeometry(width, height, depth);

const radius = 1;
const widthSegments = 17;
const heightSegments = 17;
const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);


const light1 = new THREE.PointLight(color, intensity);
light1.position.set(7,8,4);
scene.add(light1);

function createTextHelvetica(text, gameHeight, Width, Depth){
	const countdownImage = convertHelveticaToImage(text, 0xff0000, 80);

	const countdownText = createTexture(countdownImage);

	const textMaterial = new THREE.MeshBasicMaterial({map: countdownText});

	const textSize = { width: 201, height: 95 };
	const textMesh = new THREE.Mesh(boxGeometry, textMaterial);
	textMesh.scale.set(textSize.width, gameHeight, textSize.height);
	textMesh.rotateY(Math.PI);

	textMesh.position.set(Width, gameHeight/2 ,Depth);

	return textMesh;
}

function createTitle(gameHeight){
	const gameTitleImage = convertGameNameToImage("Ping-Pong");

	const titleImage = createTexture(gameTitleImage);
	const textureMaterial = new THREE.MeshBasicMaterial({map: titleImage});
	const textureTitleSize = { width: 201, height: 95 };
	const textureMesh = new THREE.Mesh(boxGeometry, textureMaterial);
	textureMesh.scale.set(textureTitleSize.width, gameHeight, textureTitleSize.height);
	textureMesh.rotateY(Math.PI);
	textureMesh.position.set(0, gameHeight/2 +0,0);
	return textureMesh;
}

function createPlayer1(name, gameHeight, gameWidth, gameDepth){
	const player1 = convertPlayerNameToImage(name,'0xff0077');
	const player1Image = createTexture(player1);
	const textureMaterialPlayer1 = new THREE.MeshBasicMaterial({map: player1Image});
	const player1Size = {width: 200, height: 75};
	const player1Mesh = new THREE.Mesh(boxGeometry, textureMaterialPlayer1);
	player1Mesh.scale.set(player1Size.width, gameHeight, player1Size.height);
	player1Mesh.rotateY(Math.PI);
	player1Mesh.position.set(gameWidth/2 - 120, gameHeight/2, -gameDepth/2 + 50);
	return player1Mesh;
}

function createPlayer2(name, gameHeight, gameWidth, gameDepth){
	const player2 = convertPlayerNameToImage(name,'0x00ff77');
	const player2Image = createTexture(player2);
	const textureMaterialPlayer2 = new THREE.MeshBasicMaterial({map: player2Image});
	const player2Size = {width: 200, height: 75};
	const player2Mesh = new THREE.Mesh(boxGeometry, textureMaterialPlayer2);
	player2Mesh.scale.set(player2Size.width, gameHeight, player2Size.height);
	player2Mesh.rotateY(Math.PI);
	player2Mesh.position.set(-gameWidth/2 + 80, gameHeight/2, -gameDepth/2 + 50);
	return player2Mesh;
}

function createScore1(score, gameHeight, gameWidth, gameDepth, winCondition){
	const scorePlayer1 = convertScoreToImage(score, '0x00ff00', winCondition);
	const scorePlayer1Image = createTexture(scorePlayer1);
	const textureMaterialScorePlayer1 = new THREE.MeshBasicMaterial({map: scorePlayer1Image});
	const scorePlayersize = {width: 100, height: 75};
	const scorePlayer1Mesh = new THREE.Mesh(boxGeometry, textureMaterialScorePlayer1);
	scorePlayer1Mesh.scale.set(scorePlayersize.width, gameHeight/2, scorePlayersize.height);
	scorePlayer1Mesh.rotateY(Math.PI);
	scorePlayer1Mesh.position.set(gameWidth/2 - 240, gameHeight/2, gameDepth/2 - 120 )
	return scorePlayer1Mesh
}

function createScore2(score, gameHeight, gameWidth, gameDepth, winCondition){
	const scorePlayer2 = convertScoreToImage(score, '0x00ff00', winCondition);
	const scorePlayer2Image = createTexture(scorePlayer2);
	const textureMaterialScorePlayer2 = new THREE.MeshBasicMaterial({map: scorePlayer2Image});
	const scorePlayersize = {width: 100, height: 75};
	const scorePlayer2Mesh = new THREE.Mesh(boxGeometry, textureMaterialScorePlayer2);
	scorePlayer2Mesh.scale.set(scorePlayersize.width, gameHeight/2, scorePlayersize.height);
	scorePlayer2Mesh.rotateY(Math.PI);
	scorePlayer2Mesh.position.set(-gameWidth/2 + 240, gameHeight/2, gameDepth/2 - 120 )
	return scorePlayer2Mesh
}

function createFloor(gameHeight, gameWidth, gameDepth){
	const floorMaterial = new THREE.MeshPhongMaterial( {color: 0x262626, transparent : true, opacity: 0 });
	const floorMesh = new THREE.Mesh(boxGeometry, floorMaterial);

	floorMesh.scale.set(gameWidth,gameHeight,gameDepth);
	floorMesh.position.set(0,gameHeight/2,0);
	return floorMesh;
}

function createVerticalLine(gameDepth){
	const lineMaterial = new THREE.LineDashedMaterial({ color :0xFFFFFF, dashSize: 2, gapSize: 1, scale:1});
	const linePoint = [];
	linePoint.push(new THREE.Vector3(0,0.1,gameDepth/2));
	linePoint.push(new THREE.Vector3 (0,0.1,-gameDepth/2));
	const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoint);
	const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
	return lineMesh;
}

function createLeftWall(color, gameWidth, gameDepth){
	const leftWallMaterial = new THREE.MeshPhongMaterial({ color: color });
	const leftWallMesh = new THREE.Mesh(boxGeometry, leftWallMaterial);
	leftWallMesh.scale.set(wallDepth, wallHeight,gameDepth + 2 * wallDepth);
	leftWallMesh.position.set(gameWidth/2 + wallDepth/2,  wallHeight/2,0);
	return leftWallMesh;
}

function createRightWall(color, gameWidth, gameDepth){
	const rightWallMaterial = new THREE.MeshPhongMaterial({ color: color});
	const rightWallMesh = new THREE.Mesh(boxGeometry, rightWallMaterial);
	rightWallMesh.scale.set(wallDepth,wallHeight,gameDepth + 2 * wallDepth);
	rightWallMesh.position.set(-gameWidth/2 - wallDepth/2,  wallHeight/2,0);
	return rightWallMesh;
}

function createTopWall(color, gameWidth, gameDepth){
	const topWallMaterial = new THREE.MeshPhongMaterial({ color:color });
	const topWallMesh = new THREE.Mesh(boxGeometry, topWallMaterial);
	topWallMesh.scale.set(gameWidth,wallHeight,wallDepth);
	topWallMesh.position.set(0, wallHeight/2, gameDepth/2 + wallDepth/2);
	return topWallMesh;
}

function createBottomWall(color, gameWidth, gameDepth){
	const bottomWallMaterial = new THREE.MeshPhongMaterial({ color: color });
	const bottomWallMesh = new THREE.Mesh(boxGeometry, bottomWallMaterial);
	bottomWallMesh.scale.set(gameWidth,wallHeight,wallDepth);
	bottomWallMesh.position.set(0, wallHeight/2, -gameDepth/2 - wallDepth/2);
	return bottomWallMesh;
}

function createBall(checkerboardTexture, ballRadius){
	const ballMaterial = new THREE.MeshBasicMaterial({map: checkerboardTexture});
	const ballMesh = new THREE.Mesh(sphereGeometry, ballMaterial);
	ballMesh.scale.set(ballRadius, ballRadius, ballRadius);
	ballMesh.position.set(ballXPosition,ballRadius,ballYPosition);
	return ballMesh;
}

function createLeftPaddle(gameHeight, gameWidth, paddleDepth, paddleWidth){
	const leftPaddleOffset = gameWidth/2 - paddleOffset;
	const leftPaddleMaterial = new THREE.MeshPhongMaterial({color: 0xff0077});
	const leftPaddleMesh = new THREE.Mesh(boxGeometry, leftPaddleMaterial);
	leftPaddleMesh.scale.set(paddleDepth, paddleHeight, paddleWidth);
	leftPaddleMesh.position.set(leftPaddleOffset, (paddleHeight + gameHeight)/2, leftPaddlePosition);
	return leftPaddleMesh;
}

function createRightPaddle(gameHeight, gameWidth, paddleDepth, paddleWidth){
	const rightPaddleOffset = -gameWidth/2 + paddleOffset;
	const rightPaddleMaterial = new THREE.MeshPhongMaterial({color: 0x00ff77});
	const rightPaddleMesh = new THREE.Mesh(boxGeometry, rightPaddleMaterial);
	rightPaddleMesh.scale.set(paddleDepth, paddleHeight, paddleWidth);
	rightPaddleMesh.position.set(rightPaddleOffset, (paddleHeight + gameHeight)/2, rightPaddlePosition);
	return rightPaddleMesh;
}

function createCheckerboardTexture(size, color1, color2) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext('2d');

	for (let x = 0; x < size; x += size / 8) {
		for (let y = 0; y < size; y += size / 8) {
			ctx.fillStyle = (x ^ y) & size / 8 ? color1 : color2;
			ctx.fillRect(x, y, size / 8, size / 8);
		}
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

function updateBallRotation(ballMesh, previousBallPosition,ballPosition, ballRadius){

	const displacementVector = new THREE.Vector3().copy(ballPosition).sub(previousBallPosition);
	const direction = displacementVector.clone().normalize();
	const rotationAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
	const displacement = displacementVector.length();
	const rotationAngle = Math.atan(displacement/ballRadius);
	ballMesh.rotateOnWorldAxis(rotationAxis, rotationAngle);
}

// text stuff...
function convertHelveticaToImage(text, color, fontSize){
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const padding = 250;
	const width = context.measureText(text).width + padding;

	const height = fontSize;
	const fontFamily = "Helvetica";

	canvas.width = width;
	canvas.height = height +100;

	context.font = fontSize + 'px '+ fontFamily;
	context.fillStyle = "#" + ("000000" + parseInt(color).toString(16)).slice(-6);
	context.fillText(text, 90, 100);

	// canvas --> data URL
	const imgData = canvas.toDataURL('image/png');
	// create an image element
	const img = new Image();
	img.src = imgData;
	return img;
}

function removeInstruction(){
	if (instructionMesh && floorGroup.contains(instructionMesh)){
		floorGroup.remove(instructionMesh);
	}
}

function loadInstruction(){
	const img = new Image();

	const imageUrl = 'media/instructions.png';
	const textureLoader = new THREE.TextureLoader();
	return new Promise((resolve, reject) => {
		textureLoader.load(imageUrl, function(texture){
			const instructionMaterial = new THREE.MeshBasicMaterial({map: texture});
			const instructionMesh = new THREE.Mesh(boxGeometry, instructionMaterial);
			const instructionSize = { width: 800, height : 600, gameHeight: 0.1};
			instructionMesh.scale.set(instructionSize.width,instructionSize.gameHeight, instructionSize.height);
			instructionMesh.rotateY(Math.PI);
			instructionMesh.position.set(-20,-10,0);
			resolve(instructionMesh);
		}, undefined, reject);
	});
}


function loadInstruction_new() {
	const img = new Image();
	const imageUrl = 'media/instructions.png?' + new Date().getTime();
	const textureLoader = new THREE.TextureLoader();
	return new Promise((resolve, reject) => {
		const onLoad = function (texture) {
			const instructionMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
			const instructionMesh = new THREE.Mesh(boxGeometry, instructionMaterial);
			const instructionSize = { width: 800, height: 600, gameHeight: 0.1 };
			instructionMesh.scale.set(instructionSize.width, instructionSize.gameHeight, instructionSize.height);
			instructionMesh.rotateY(Math.PI);
			instructionMesh.position.set(-20, 50, 0);

			if (instructionMaterial.map) {
				instructionMaterial.map.dispose();
			}

			resolve(instructionMesh);
		};

		const onError = function (error) {
			reject(error);
		};

		textureLoader.load(imageUrl, onLoad, undefined, onError);
	});
}

function reloadInstruction() {
	removeInstruction();
	loadInstruction().then(mesh => {
		instructionMesh = mesh;
		floorGroup.add(instructionMesh);
	}).catch(error => {
		console.error('Error reloading instruction:', error);
	});
}

function convertGameNameToImage(text){
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');


	const padding = 155;
	const width = context.measureText(text).width + padding;
	const fontSize = 30;
	const height = fontSize;
	const fontFamily = "Zapfino";

	canvas.width = width;
	canvas.height = height +65;

	context.font = fontSize + 'px '+ fontFamily;
	context.fillStyle = 'red';
	context.fillText(text, 10, 50);

	const imgData = canvas.toDataURL('image/png');
	// create an image element
	const img = new Image();
	img.src = imgData;
	return img;
}

function convertPlayerNameToImage(text, color){

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');


	const padding = 155;
	const width = context.measureText(text).width + padding;
	const fontSize = 15;
	const height = fontSize;
	const fontFamily = "Zapfino";

	canvas.width = width;
	canvas.height = height +60;

	context.font = fontSize + 'px '+ fontFamily;
	context.fillStyle = "#" + ("000000" + parseInt(color).toString(16)).slice(-6);

	context.fillText(text, 10, 50);

	const imgData = canvas.toDataURL('image/png');

	const img = new Image();
	img.src = imgData;
	return img;
}

function convertScoreToImage(text, color, winningScore){

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');


	const padding = 250;
	const width = context.measureText(text).width + padding;
	const fontSize = 60;
	const height = fontSize;
	const fontFamily = "Helvetica";

	canvas.width = width;
	canvas.height = height +100;

	context.font = fontSize + 'px '+ fontFamily;
	context.fillStyle = "#" + ("000000" + parseInt(color).toString(16)).slice(-6);

	context.fillText(text, 90, 100);
	// winningscore stuff...
	if (parseInt(text) === winningScore){
		context.fillText("Winner", 10,40);
		isGameStarted = true;
		isGameRunning = false;
		startButton.textContent = "Start Local Game";
		startButton.disabled = false;
	}
	const imgData = canvas.toDataURL('image/png');

	const img = new Image();
	img.src = imgData;

	return img;
}

function createTexture(image){
	const texture = new THREE.Texture(image);
		texture.needsUpdate = true;
	return texture;
}

function	handleKeyDown(event, paddleMove, paddleMove2){

	if (event.key === "ArrowDown")
	{
		paddleMove = "up";
	}
	else if (event.key === "ArrowUp")
	{
		paddleMove = "down";
	}
	if (event.key === "s")
	{
		paddleMove2 = "up2";
	}
	else if (event.key === "w")
	{
		paddleMove2 = "down2";
	}
	return ([paddleMove, paddleMove2]);
}

function	handleKeyUp(event, paddleMove, paddleMove2){
	
	if (event.key === "ArrowDown" && paddleMove === "up")
	{
		paddleMove = "stop";
	}
	else if (event.key === "ArrowUp" && paddleMove === "down")
	{
		paddleMove = "stop";
	}
	else if (event.key === "s" && paddleMove2 === "up2")
	{
		paddleMove2 = "stop2";
	}
	else if (event.key === "w" && paddleMove2 === "down2")
	{
		paddleMove2 = "stop2";
	}
	return ([paddleMove, paddleMove2]);
}

async function checkMeshesReady(scorePlayer1Mesh, scorePlayer2Mesh) {
	const texturePromises = [];

	if (scorePlayer1Mesh && scorePlayer2Mesh) {
		if (hasTexture(scorePlayer1Mesh.material) && hasTexture(scorePlayer2Mesh.material)) {
			scorePlayerMeshesReady = true;
		} else {

			if (scorePlayer1Mesh.material.map) {
				texturePromises.push(new Promise(resolve => scorePlayer1Mesh.material.map.image.addEventListener('load', resolve)));
			}
			if (scorePlayer2Mesh.material.map) {
				texturePromises.push(new Promise(resolve => scorePlayer2Mesh.material.map.image.addEventListener('load', resolve)));
			}

			await Promise.all(texturePromises);
			scorePlayerMeshesReady = true;
		}
	}
}

function resizeRendererToDisplaySize(renderer) {
	const canvas = renderer.domElement;

	const width = window.innerWidth;
	const height = window.innerHeight;

	const needResize = canvas.width !== width || canvas.height !== height;

	if (needResize) {
		renderer.setSize(0.8*width, 0.8*height, false);
	}
	return needResize;
}


function updateCameraAndRender(renderer, camera, scorePlayer1Mesh, scorePlayer2Mesh, cameraControl){
	cameraControl.update();
	if (resizeRendererToDisplaySize(renderer)){
		const canvas = renderer.domElement;
		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
	}

	checkMeshesReady(scorePlayer1Mesh, scorePlayer2Mesh).then(() => {
		// Render the scene only if all player meshes are ready with textures
		if (scorePlayerMeshesReady) {
			renderer.render( scene, camera );
		}
	});
}


function cameraSetup(canvas){
	const fov = 40;
	const aspect = 800/600;
	const near = 0.1;
	const far = 3000;

	const position = new THREE.Vector3(0,2000,0);
	const lookAt = new THREE.Vector3(0,0,0);
	const up = new THREE.Vector3(0, 0, 1);

	const camera = new CameraManager(canvas, fov, aspect, near, far, position, lookAt, up);
	camera.switchToTopView();

	const cameraControl = new THREE.OrbitControls(camera.camera,canvas);

	return {camera, cameraControl};
}


function start3dGame(event){
	startButton = document.querySelector("#startLocalGameButton");

	gameSocket = event.currentTarget;
	gameSocket.removeEventListener("message", start3dGame);

	let wssMessage = JSON.parse(event.data);

	const objects = [];

	const {camera, cameraControl} = cameraSetup(canvas);

	let gameWidth;
	let gameDepth;
	let ballRadius;
	let paddleWidth;
	let paddleDepth;
	let winCondition;
	let paddlePosY;

	let countdown;
	let playerAlias1 = "";
	let playerAlias2 = "";
	let player1Mesh;
	let player2Mesh;

	let previousBallPosition = null;
	let checkerboardTexture;
	let textureMesh;
	let floorMesh;
	let scorePlayer1Mesh;
	let scorePlayer2Mesh;

	let lineMesh;
	let leftWallMesh;
	let rightWallMesh;
	let topWallMesh;
	let bottomWallMesh;

	let ballMesh;
	let leftPaddleMesh;
	let rightPaddleMesh;

	let countdownMesh;

	loadInstruction().then(mesh => {
		instructionMesh = mesh;
		floorGroup.add(instructionMesh);
	}).catch(error => {
		console.error('Error loading instruction:', error);
	});

	if (wssMessage.type === 'gameInit'){

		gameWidth = wssMessage.canvas_width;
		gameDepth = wssMessage.canvas_height;
		ballRadius = wssMessage.ball_radius;
		paddleWidth = wssMessage.paddles_height;
		paddleDepth = wssMessage.paddles_width;
		winCondition = wssMessage.win_condition;
		paddlePosY = (gameDepth - paddleWidth) / 2;

		checkerboardTexture = createCheckerboardTexture(512, '#FFFFFF', '#000000');
		textureMesh = createTitle(gameHeight);
		floorMesh = createFloor(gameHeight, gameWidth, gameDepth);
		scorePlayer1Mesh = createScore1(0, gameHeight, gameWidth, gameDepth, winCondition);
		scorePlayer2Mesh = createScore2(0, gameHeight, gameWidth, gameDepth, winCondition);
		lineMesh = createVerticalLine(gameDepth);
		leftWallMesh = createLeftWall(0x353535,gameWidth, gameDepth );
		rightWallMesh = createRightWall(0x353535,gameWidth, gameDepth );
		topWallMesh = createTopWall(0x353535,gameWidth, gameDepth );
		bottomWallMesh = createBottomWall(0x353535,gameWidth, gameDepth );
		ballMesh = createBall(checkerboardTexture, ballRadius);
		leftPaddleMesh = createLeftPaddle(gameHeight, gameWidth, paddleDepth, paddleWidth);
		rightPaddleMesh = createRightPaddle(gameHeight, gameWidth, paddleDepth, paddleWidth);

		floorGroup.add(floorMesh);
		floorGroup.add(textureMesh);
		floorGroup.add(scorePlayer1Mesh);
		floorGroup.add(scorePlayer2Mesh);


		dynamicElementsGroup.add(ballMesh);
		dynamicElementsGroup.add(leftPaddleMesh);
		dynamicElementsGroup.add(rightPaddleMesh);
		gameBoard.add(lineMesh);
		gameBoard.add(leftWallMesh);
		gameBoard.add(rightWallMesh);
		gameBoard.add(topWallMesh);
		gameBoard.add(bottomWallMesh);
	}

	objects.push(gameScene);

	let previousPlayer1Score = 0;
	let previousPlayer2Score = 0;

	updateCameraAndRender(renderer, camera.camera, scorePlayer1Mesh, scorePlayer2Mesh, cameraControl);
	/////////////////////////////////////////////////////////////////////////////////////////////////

	gameSocket.addEventListener("message", (event) => {
		wssMessage = JSON.parse(event.data);
		isCountdownInitiationStarted = false;
		if (isGameRunning){
			startButton.textContent = "Game Started";
			startButton.disabled = true;
		}

		if (wssMessage.type === 'countdown'){
			instructionMesh.visible=true;
			if (!isCountdownInitiationStarted){

				playerAlias1 = wssMessage.p1;
				playerAlias2 = wssMessage.p2;
				player1Mesh = createPlayer1(playerAlias1, gameHeight, gameWidth, gameDepth);
				player2Mesh = createPlayer2(playerAlias2, gameHeight, gameWidth, gameDepth);
				floorGroup.add(player1Mesh);
				floorGroup.add(player2Mesh);
				gameBoard.add(floorGroup);
				gameScene.add(gameBoard);
				gameScene.add(dynamicElementsGroup);
				scene.add(gameScene);
				isCountdownInitiationStarted = true;
			}

			countdown = wssMessage.count;

			if (!isCountdownStarted){
				countdownMesh = createTextHelvetica(countdown, gameHeight, 0,200);
				floorGroup.add(countdownMesh);
				isCountdownStarted = true;
			} else {
				floorGroup.remove(countdownMesh);
				countdownMesh = createTextHelvetica(countdown, gameHeight, 0,200);
				floorGroup.add(countdownMesh);
			}
			if (countdown === 'start'){
				setTimeout(()=>{
					floorGroup.remove(countdownMesh);
					instructionMesh.visible = false;
				}, 2000)

			}
			updateCameraAndRender(renderer, camera.camera, scorePlayer1Mesh, scorePlayer2Mesh, cameraControl);
		}

		if (wssMessage.type === 'status'){
			let rightPaddlePosition = wssMessage.rp[1];
			let leftPaddlePosition = wssMessage.lp[1];
			let ballPositionX = wssMessage.bp[0] ;
			let ballPositionY = wssMessage.bp[1] ;
			let player1Score = wssMessage.sc[0];
			let player2Score = wssMessage.sc[1];

			instructionMesh.visible = false;


			if (player1Mesh === undefined){
				playerAlias1 = wssMessage.p1;
				player1Mesh = createPlayer1(playerAlias1, gameHeight, gameWidth, gameDepth);
				floorGroup.add(player1Mesh);
			}
			if (player2Mesh === undefined){
				playerAlias2 = wssMessage.p2;
				player2Mesh = createPlayer2(playerAlias2, gameHeight, gameWidth, gameDepth);
				floorGroup.add(player2Mesh);
			}

			gameBoard.add(floorGroup);
			gameScene.add(gameBoard);
			gameScene.add(dynamicElementsGroup);
			scene.add(gameScene);

			rightPaddleMesh.position.z = (rightPaddlePosition - gameDepth/2) + paddleWidth/2;
			leftPaddleMesh.position.z = (leftPaddlePosition - gameDepth/2) + paddleWidth/2;
			ballMesh.position.x = - (ballPositionX - gameWidth/2);
			ballMesh.position.z = (ballPositionY - gameDepth/2);


			if (previousBallPosition !== null) {
				updateBallRotation(ballMesh, previousBallPosition, ballMesh.position, ballRadius);
			}
			previousBallPosition= ballMesh.position.clone();

			if (player1Score != previousPlayer1Score){
				floorGroup.remove(scorePlayer1Mesh);
				scorePlayer1Mesh = createScore1(player1Score, gameHeight, gameWidth, gameDepth, winCondition);
				floorGroup.add(scorePlayer1Mesh);
				previousPlayer1Score = player1Score;
			}
			if (player2Score != previousPlayer2Score){
				floorGroup.remove(scorePlayer2Mesh);
				scorePlayer2Mesh = createScore2(player2Score, gameHeight, gameWidth, gameDepth, winCondition);
				floorGroup.add(scorePlayer2Mesh);
				previousPlayer2Score = player2Score;
			}

			if (isGameStarted){
				camera.switchToTopView();
				isGameStarted = false;
			}
			updateCameraAndRender(renderer, camera.camera, scorePlayer1Mesh, scorePlayer2Mesh, cameraControl);
		}
	});

	window.addEventListener("resize", function(event) {
		resizeRendererToDisplaySize(renderer);
	});

	resizeRendererToDisplaySize(renderer);
	////////////////////////////////////////////////////////////////////////////////

	let	paddleMove = "stop";
	let	previousMove = "stop";
	let	paddleMove2 = "stop2";
	let	previousMove2 = "stop2";
	let	allPaddleMove;

	window.addEventListener('keydown', function(event) {
		allPaddleMove = handleKeyDown(event, paddleMove, paddleMove2);
		paddleMove = allPaddleMove[0];
		paddleMove2 = allPaddleMove[1];
	});
	window.addEventListener('keyup', function(event) {
		allPaddleMove = handleKeyUp(event, paddleMove, paddleMove2);
		paddleMove = allPaddleMove[0];
		paddleMove2 = allPaddleMove[1];
	});


	let	refreshRate = (1000/30);
	setInterval(function() {
		if (paddleMove !== previousMove)
		{
			gameSocket.send(paddleMove);
			previousMove = paddleMove;
		}
		if (paddleMove2 !== previousMove2)
		{
			gameSocket.send(paddleMove2);
			previousMove2 = paddleMove2;
		}
	}, refreshRate);

}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function loadGame() {
	const game_pill = document.querySelector('#v-pills-game');
	const content = document.createElement('div');
	content.id = 'startLocalGameDiv';
	const buttonContent = isGameRunning ? "Game Started" : "Start Local Game";
	content.innerHTML = `
		<button type="submit" id="startLocalGameButton" class="btn btn-primary">${buttonContent}</button>
	`;
	game_pill.appendChild(content);

	// Add event listener to button
	document.querySelector("#startLocalGameButton").addEventListener("click", function (event) {
		fetch("/gameapp/start_local_game/")
		.then(response => {
			if (response.ok){
				isGameRunning = true;
			} else {
				console.error("Fetch problem: ", response.statusText);
			}
		})
		.catch((err) => console.error(`Fetch problem: ${err.message}`));
	});

    const url = "users/user/" + getCookie("user_id")
    fetch(url)
    .then((response2) => {
        if (!response2.ok) {
            throw new Error(`HTTP error: ${response2.status}`);
        }
        return response2.json();
    })
    .then(json => {
        if ((json.status === "playing_online") || (json.status === "playing_offline"))
        {
            isGameRunning = true;
            startButton = document.querySelector("#startLocalGameButton");
            startButton.textContent = "Game Started";
			startButton.disabled = true;
        }
        else
        {  isGameRunning = false; }
    })
    .catch((error) => {
        console.error(`Fetch friend problem: ${error.message}`);

    });

	let host = window.location.host;
	const gameSocket = new WebSocket(`wss://${host}/ws/game/`);
	isGameStarted = true;
	// gameSocket.addEventListener("message", start2dGame);  // 2-D Game.
	gameSocket.addEventListener("message", start3dGame);  // 3-D Game.
}

///////////////////////////////////////////////////////////////////////////////
/////////////////// FUNCTIONS FOR THE 2-D GAME. ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function	start2dGame(event){
	// gameSocket = event.currentTarget.myParameter;  // Read the added parameter of the instance.
	gameSocket = event.currentTarget;
	gameSocket.removeEventListener("message", start2dGame);
	startButton = document.querySelector("#startLocalGameButton");

	const gameInit = JSON.parse(event.data);
	if (gameInit.type !== 'gameInit'){
		return ;
	}

	const game_pill = document.querySelector('#v-pills-game');
	document.querySelector('#gameCanvas').remove();  // Remove the canvas (for the 3-D game) from the html.

	const content = document.createElement('div');
	content.id = 'gameDiv';
	content.innerHTML = `<canvas id="gameCanvas" \
		tabindex='1'>This is the canvas on which the game "Pong" can be played.</canvas>
	`;
	game_pill.insertBefore(content, game_pill.firstChild);
	
	////////////////////////////////////////////////////////////////////////////////////
	const paddlePosY = (gameInit.canvas_height - gameInit.paddles_height) / 2
	let	state = {
		"lp": [0, paddlePosY],
		"rp": [gameInit.canvas_width - gameInit.paddles_width, paddlePosY],
		"bp": [gameInit.canvas_width / 2, gameInit.canvas_height / 2],
		"sc": [0, 0]
	}
	
	const canvas2d = document.getElementById('gameCanvas');
	const ctx = canvas2d.getContext('2d');
	window.addEventListener("resize", function(event) {
		resizeGame(canvas2d, gameInit);
		draw(ctx, state, gameInit);
	});
	resizeGame(canvas2d, gameInit);
	draw(ctx, state, gameInit);  // Initial draw.
	////////////////////////////////////////////////////////////////////////////////
	
	let	paddleMove = "stop";
	let	previousMove = "stop";
	let	paddleMove2 = "stop2";
	let	previousMove2 = "stop2";
	let	allPaddleMove;

	ctx.canvas.addEventListener('keydown', function(event) {
		allPaddleMove = handleKeyDown2d(event, paddleMove, paddleMove2);
		paddleMove = allPaddleMove[0];
		paddleMove2 = allPaddleMove[1];
	});
	ctx.canvas.addEventListener('keyup', function(event) {
		allPaddleMove = handleKeyUp2d(event, paddleMove, paddleMove2);
		paddleMove = allPaddleMove[0];
		paddleMove2 = allPaddleMove[1];
	});

	gameSocket.addEventListener("message", (event) => {
		if (isGameRunning){
			startButton.textContent = "Game Started";
			startButton.disabled = true;
		}
		state = JSON.parse(event.data);
		if (state.type === 'status'){
			draw(ctx, state, gameInit);
			if (state.won !== "0"){
				isGameRunning = false;
				startButton.textContent = "Start Local Game";
				startButton.disabled = false;
			}
		}
	});

	let	refreshRate = (1000 / 30);
	setInterval(function() {
		if (paddleMove !== previousMove)
		{
			gameSocket.send(paddleMove);
			previousMove = paddleMove;
		}
		if (paddleMove2 !== previousMove2)
		{
			gameSocket.send(paddleMove2);
			previousMove2 = paddleMove2;
		}
	}, refreshRate);
}

function	draw(ctx, state, gameInit){

	// Clear canvas
    ctx.clearRect(0, 0, gameInit.canvas_width, gameInit.canvas_height);

	//////// Test to have special effects on the game. ///////////////////////
	// ctx.save();
	// // ctx.fillStyle = "rgb(0 0 0 / 80%)";
	// ctx.fillStyle = "rgb(0 0 0 / 30%)";
	// ctx.fillRect(0, 0, gameInit.canvas_width, gameInit.canvas_height);
	// ctx.restore();
	//////////////////////////////////////////////////////////////////////////

	// Draw paddles and ball based on state received from server
	ctx.fillRect(state.lp[0], state.lp[1], 
		gameInit.paddles_width, gameInit.paddles_height);
	ctx.fillRect(state.rp[0], state.rp[1],
		gameInit.paddles_width, gameInit.paddles_height);
	ctx.beginPath();
	ctx.arc(state.bp[0], state.bp[1], gameInit.ball_radius, 0, Math.PI * 2);
	ctx.fill();

	// Draw scores.
	ctx.fillText(state.sc[0], gameInit.canvas_width / 4, gameInit.canvas_height / 5);
	ctx.fillText(state.sc[1], 3 * gameInit.canvas_width / 4, gameInit.canvas_height / 5);
	
	// Draw the the middle line.
	ctx.beginPath(); // Start a new path
	ctx.moveTo(gameInit.canvas_width / 2, 0);
	ctx.lineTo(gameInit.canvas_width / 2, gameInit.canvas_height);
	ctx.stroke(); // Render the path
}

function	resizeGame(canvas2d, gameInit) {

	// Calculate canvas width.
	const	navbar = document.querySelector("#v-pills-tab");
	let		styles = window.getComputedStyle(navbar);
	const	leftMargin = parseInt(styles["marginLeft"], 10);
	const	rightMargin = parseInt(styles["marginRight"], 10);
	let		unavailableSpace = navbar.offsetWidth + leftMargin + rightMargin;

	// On the following line we are subtracting "rightMargin" to leave some space between 
	// the right border of the canvas and the right border of the window.
	windowWwidth = window.innerWidth - unavailableSpace - rightMargin;

	// Calculate canvas height.
	// Calculate size of <h1> first.
	// let	h = document.querySelector("#h1");
	// styles = window.getComputedStyle(h);
	// let	topMargin = parseInt(styles["marginTop"], 10);
	// let	bottomMargin = parseInt(styles["marginBottom"], 10);
	// unavailableSpace = h.offsetHeight + topMargin + bottomMargin;
	// Calculate and add size of <h2>.
	// h2 = document.querySelector("#h2");
	// styles = window.getComputedStyle(h2);
	// topMargin = parseInt(styles["marginTop"], 10);
	// bottomMargin = parseInt(styles["marginBottom"], 10);
	// unavailableSpace = unavailableSpace + h.offsetHeight + topMargin + bottomMargin;

	// On the following line we are subtracting "rightMargin" to leave some space between 
	// the bottom border of the canvas and the bottom border of the window.
	windowHeight = window.innerHeight - unavailableSpace - rightMargin;

	const	aspectRatio = gameInit.canvas_width / gameInit.canvas_height;
	const	windowAspectRatio = windowWwidth / windowHeight;
	if (windowAspectRatio > aspectRatio) {
		// Window is wider than the game's aspect ratio
		canvas2d.width = windowHeight * aspectRatio;
		canvas2d.height = windowHeight;
	} else {
		// Window is taller than or equal to the game's aspect ratio
		canvas2d.width = windowWwidth;
		canvas2d.height = windowWwidth / aspectRatio;
	}

	// draw(ctx, state, gameInit);

	///////////////////////////////////////////////////////////////////////////
	const ctx = canvas2d.getContext('2d');
	ctx.fillStyle = 'white';  // For fill().
	ctx.strokeStyle = 'white';  // For stroke().
	ctx.font = "48px sans-serif"  // For fillText().
	ctx.setLineDash([4, 4]);  // For a dashed line.
	ctx.lineWidth = 2;  // For setLineDash().
	///////////////////////////////////////////////////////////////////////////////
	scaleX = canvas2d.width / gameInit.canvas_width;
	scaleY = canvas2d.height / gameInit.canvas_height;
	ctx.scale(scaleX, scaleY);

	document.querySelector("canvas").style.borderRadius = ((gameInit.paddles_height / 2) * scaleY) + "px";;
}

function	handleKeyDown2d(event, paddleMove, paddleMove2){
	// Maybe:
	// if (!event.repeat) { gameSocket.send(event.key); }
	if (event.key === "ArrowUp")
	{
		paddleMove = "up";
	}
	else if (event.key === "ArrowDown")
	{
		paddleMove = "down";
	}
	if (event.key === "w")
	{
		paddleMove2 = "up2";
	}
	else if (event.key === "s")
	{
		paddleMove2 = "down2";
	}
	return ([paddleMove, paddleMove2]);
}

function	handleKeyUp2d(event, paddleMove, paddleMove2){
	if (event.key === "ArrowUp" && paddleMove === "up")
	{
		paddleMove = "stop";
	}
	else if (event.key === "ArrowDown" && paddleMove === "down")
	{
		paddleMove = "stop";
	}
	else if (event.key === "w" && paddleMove2 === "up2")
	{
		paddleMove2 = "stop2";
	}
	else if (event.key === "s" && paddleMove2 === "down2")
	{
		paddleMove2 = "stop2";
	}
	return ([paddleMove, paddleMove2]);
}