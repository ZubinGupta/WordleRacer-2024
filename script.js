import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  set,
  onChildRemoved,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { guessDictionary, realDictionary, diffDict } from './dictionary.js';


const appSettings = {
  databaseURL: "https://wordleracer-default-rtdb.firebaseio.com/",
};

console.log('Initializing Firebase app'); // Debugging statement
const app = initializeApp(appSettings);
console.log('Firebase app initialized'); // Debugging statement

const database = getDatabase(app);
console.log('Database initialized'); // Debugging statement


var pKey;

var isDQ = false;


// for testing purposes, make sure to use the test dictionary
const guess = guessDictionary;
const dictionary = realDictionary;
const diff = diffDict;
var done = false;
let gamesList = [];
var state = {
  secret: diff[Math.floor(Math.random() * diff.length)],
  grid: Array(6)
    .fill()
    .map(() => Array(5).fill('')),
  currentRow: 0,
  currentCol: 0,
};
var srow = 0;
var scol = 0;
var username = '';
var roomCode = 'default';
var mult = -1;
var position;

const fromInput = { value: 1 }; // Default value for fromInput
const toInput = { value: 5 }; // Default value for toInput

window.storeRoomCode = function () {
  const roomCodeInput = document.getElementById('room');
  if (username.trim() !== '' && roomCodeInput.value.trim() !== '' && roomCodeInput.value != "default") {
    roomCode = roomCodeInput.value;
    console.log('Room code stored:', roomCode);
    roomCodeInput.value = `Room Code: ${roomCode}`;
    roomCodeInput.disabled = true;
    document.getElementById('roomcodebutton').style.display = 'none';
    const reference = ref(database, `${roomCode}/players`);
    position = 0;
    // Check if username already exists and replace if necessary
    onValue(reference, function (snapshot) {
      let newUsername = username;
      if (snapshot.exists()) {
        const pList = Object.values(snapshot.val());
        position = pList.length;
        let count = 1;
        while (pList.includes(newUsername)) {
          count++;
          newUsername = `${username} ${count}`;
        }
        if (roomCode != 'default') {
          document.getElementById('pListDisplay').innerText = "Players:\n" + pList.join('\n');
        }
      }
      const newUserRef = push(reference, newUsername);
      pKey = newUserRef.key; // Capture the unique key for the pushed user data
      console.log('pkey is ' + pKey);
      document.getElementById('username').value = `Username: ${newUsername}`;
      console.log('Username pushed:', newUsername);
      username = newUsername;

      // Add "Start" button if position is zero
      if (position === 0) {
        const startButton = document.createElement('button');
        startButton.textContent = 'Start';
        startButton.id = 'startButton';
        startButton.addEventListener('click', function () {
          startGame();
        });
        document.getElementById('displayContainer').appendChild(startButton);
      }
    }, { onlyOnce: true });

    onValue(reference, function (snapshot) {
      console.log('onValue triggered'); // Debugging statement
      if (snapshot.exists()) {
        const pList = Object.values(snapshot.val());
        console.log('pList updated:', pList);
        if (roomCode != 'default') {
          document.getElementById('pListDisplay').innerText = "Players:\n" + pList.join('\n');
        }
      } else {
        console.log('No data available');
        document.getElementById('pListDisplay').value = '';
      }
    });
    const gamesRef = ref(database, `${roomCode}/games`);
    onValue(gamesRef, function (snapshot) {
      console.log('onValue triggered'); // Debugging statement
      if (snapshot.exists()) {
        gamesList = Object.values(snapshot.val());
        console.log('gamesList updated:');
        mult = 0;
        reset();
        document.getElementById("hello").innerText = "Game started! GO GO GO!";
      } else {
        console.log('No data available');

      }
    });
    const winnerRef = ref(database, `${roomCode}/winner`);
    onValue(winnerRef, function (snapshot) {
      console.log('onValue triggered'); // Debugging statement
      if (snapshot.exists()) {
        const winnerList = Object.values(snapshot.val());
        console.log('winnerList updated:', winnerList);
        document.getElementById("hello").innerText = "The winner is: " + winnerList;
        mult = -1;
        reset();
      } else {
        console.log('No data available');
      }
    });

    const roomRef = ref(database, roomCode);
    onChildRemoved(roomRef, function (snapshot) {
      document.getElementById("pListDisplay").innerText = "";
      console.log('Room deleted, host has left');
      mult = -1;
      reset();
      
    });

  } else {
    console.log('Username and room code cannot be empty');
  }
}

window.addEventListener('beforeunload', function (event) {
  if(roomCode != 'default'){
    if(position === 0){
      console.log("host left");
      remove(ref(database, roomCode));
    }else{
      console.log("bye bye not host");
      remove(ref(database, `${roomCode}/players/${pKey}`));
    }
  }
});

function startGame() {
  console.log('Start button clicked');
  // Generate 3 random words
  document.getElementById('startButton').style.display = 'none';
  const gamesRef = ref(database, `${roomCode}/games`);
  for (let i = 0; i < 3; i++) {
    const max = toInput.value;
    const min = fromInput.value;
    const num = Math.floor(Math.random() * 303 * (max - min + 1)) + min * 303 - 303;
    push(gamesRef, diff[num] + ' ' + (Math.floor(num / 303) + 1));
  }
  console.log('Generated words');

  // Push the generated words to roomCode/games



  // Add your game start logic here
}

window.storeUsername = function () {
  const usernameInput = document.getElementById('username');
  if (usernameInput.value.trim() !== '') {
    username = usernameInput.value;
    console.log('Username stored:', username);
    usernameInput.value = `Username: ${username}`;
    usernameInput.disabled = true;
    document.getElementById('usernamebutton').style.display = 'none';
  } else {
    console.log('Username cannot be empty');
  }
}
function drawGrid(container) {
  const grid = document.createElement('div');
  grid.className = 'grid';

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      drawBox(grid, i, j);
    }
  }

  container.appendChild(grid);
}

function updateGrid() {
  for (let i = 0; i < state.grid.length; i++) {
    for (let j = 0; j < state.grid[i].length; j++) {
      const box = document.getElementById(`box${i}${j}`);
      box.textContent = state.grid[i][j];
    }
  }
  selectSpot();

}

function drawBox(container, row, col, letter = '') {
  const box = document.createElement('div');
  box.className = 'box';
  box.textContent = letter;
  box.id = `box${row}${col}`;

  container.appendChild(box);
  return box;
}

function registerKeyboardEvents() {
  document.body.onkeydown = (e) => {
    if (document.activeElement.tagName === 'INPUT') {
      return; // Do nothing if an input field is focused
    }
    const key = e.key;
    if (key === 'Enter') {
      if (done) {
        const playAgainButton = document.getElementById('playAgainButton');
        if (playAgainButton) {
          playAgainButton.click();
        }
      }
      else {
        if (state.currentCol === 5) {
          const word = getCurrentWord();
          if (isWordValid(word)) {
            revealWord(word);
            state.currentRow++;
            state.currentCol = 0;
          } else {
            //not a word, do nothing
          }
        }
      }
    }
    if (key === 'Backspace') {
      if (e.ctrlKey) {
        clearLine();
      }
      else {
        removeLetter();
      }
    }
    if (isLetter(key)) {
      addLetter(key);
    }
    if (key === 'Shift') { 
      if (mult == -1){
        if (done) {
          const playAgainButton = document.getElementById('playAgainButton');
          if (playAgainButton) {
            playAgainButton.click();
          }
        }
        reset();
      }
      
    }
    updateGrid();
    // document.getElementById("hello").innerHTML = `${state.currentRow},${state.currentCol},${srow},${scol}`;
  };
}

function selectSpot() {
  document.getElementById(`box${srow}${scol}`).classList.remove("select");
  srow = state.currentRow;
  if (state.currentCol != 5) {
    scol = state.currentCol;
    document.getElementById(`box${srow}${scol}`).classList.add("select");
  }
}

function clearLine() {
  for (var i = 0; i < 5; i++) {
    state.grid[state.currentRow][i] = "";
  }
  state.currentCol = 0;
}

function getCurrentWord() {
  return state.grid[state.currentRow].reduce((prev, curr) => prev + curr);
}

function isWordValid(word) {
  return dictionary.includes(word) || guess.includes(word) || diff.includes(word);
}

function getNumOfOccurrencesInWord(word, letter) {
  let result = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] === letter) {
      result++;
    }
  }
  return result;
}

function getPositionOfOccurrence(word, letter, position) {
  let result = 0;
  for (let i = 0; i <= position; i++) {
    if (word[i] === letter) {
      result++;
    }
  }
  return result;
}

function revealWord(guess) {
  const row = state.currentRow;

  for (let i = 0; i < 5; i++) {
    const box = document.getElementById(`box${row}${i}`);
    const letter = box.textContent;
    const numOfOccurrencesSecret = getNumOfOccurrencesInWord(state.secret, letter);
    const numOfOccurrencesGuess = getNumOfOccurrencesInWord(guess, letter);
    const letterPosition = getPositionOfOccurrence(guess, letter, i);

    if (numOfOccurrencesGuess > numOfOccurrencesSecret && letterPosition > numOfOccurrencesSecret) {
      box.classList.add('empty');
    } else {
      if (letter === state.secret[i]) {
        box.classList.add('right');
      } else if (state.secret.includes(letter)) {
        box.classList.add('wrong');
      } else {
        box.classList.add('empty');
      }
    }
  }

  const isWinner = state.secret === guess;
  const isGameOver = state.currentRow === 5;

  if (isWinner) {
    if (mult < 0) {
      document.getElementById("hello").innerText = "Congratulations! You got it!";
    }
    done = true;
  } else if (isGameOver) {
    if (mult > -1) {
      isDQ = true;
      set(ref(database, `${roomCode}/players/${pKey}`), `${username} lost`);
      mult = -1;
      setTimeout(() => { remove(ref(database, roomCode)) }, 1000);
    }
    document.getElementById("hello").innerText = "Better luck next time! The word was " + state.secret;
    done = true;
  }
  if (done) {
    const playAgainButton = document.createElement('button');
    playAgainButton.id = 'playAgainButton';
    playAgainButton.textContent = 'Again?';
    playAgainButton.addEventListener('click', function () {
      playAgainButton.remove();
      reset();
    });
    document.body.appendChild(playAgainButton); // Append to body to center on screen
  }
}

function isLetter(key) {
  return key.length === 1 && key.match(/[a-z]/i);
}

function addLetter(letter) {
  if (state.currentCol === 5) return;
  state.grid[state.currentRow][state.currentCol] = letter;
  state.currentCol++;
}

function removeLetter() {
  if (state.currentCol === 0) return;
  state.grid[state.currentRow][state.currentCol - 1] = '';
  state.currentCol--;
}

window.setDifficultyRange = function(min, max) {
  if(mult == -1){
    fromInput.value = min;
    toInput.value = max;
    document.getElementById("diff").innerText = `Difficulty: ${min}-${max}`;
    reset();
  }
}

function startup() {
  document.getElementById("hello").innerText = "Have fun!";
  const game = document.getElementById('game');
  drawGrid(game);

  registerKeyboardEvents();
  // state.secret = "hello";

  

  reset();
}

function reset() {
  if (mult >= 0) {
    if (!isDQ) mult++;
    if (mult < gamesList.length + 1) {
      set(ref(database, `${roomCode}/players/${pKey}`), `${username} ${mult}/3`);
      state.secret = gamesList[mult - 1].substring(0, 5);
    } else {
      const winref = ref(database, `${roomCode}/winner`);
      push(winref, username);
      mult = -1;
      var max = toInput.value;
      var min = fromInput.value;
      var num = Math.floor(Math.random() * 303 * (max - min + 1)) + min * 303 - 303;
      state.secret = diff[num];
      setTimeout(() => { remove(ref(database, roomCode)) }, 1000);
    }
  } else {
    var max = toInput.value;
    var min = fromInput.value;
    var num = Math.floor(Math.random() * 303 * (max - min + 1)) + min * 303 - 303;
    state.secret = diff[num];
  }

  done = false;
  state.grid = Array(6)
    .fill()
    .map(() => Array(5).fill(''));
  state.currentRow = 0;
  state.currentCol = 0;
  if (mult < 0) {
    document.getElementById("diff").innerText = "Difficulty: " + (Math.floor(num / 303) + 1) + "/19 ";
  } else {
    document.getElementById("diff").innerText = "Difficulty: " + (gamesList[mult - 1]).substring(6, gamesList[mult - 1].length) + "/19 ";
  }
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      const box = document.getElementById(`box${i}${j}`);
      box.classList.remove("right");
      box.classList.remove("wrong");
      box.classList.remove("empty");
    }
  }
  updateGrid();
}

document.querySelectorAll('#difficultyContainer button').forEach(button => {
  button.addEventListener('click', function() {
    if(mult === -1){
      document.querySelectorAll('#difficultyContainer button').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    }
  });
});

document.addEventListener('DOMContentLoaded', (event) => {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'BUTTON') {
      e.preventDefault();
    }
  });
});



startup();
