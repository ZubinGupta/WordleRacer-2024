import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  onValue,
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







// for testing purposes, make sure to use the test dictionary
const guess = guessDictionary;
const dictionary = realDictionary;
const diff = diffDict;
var done = false;
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

window.storeRoomCode = function () {
  const roomCodeInput = document.getElementById('room');
  if (username.trim() !== '' && roomCodeInput.value.trim() !== '' && roomCodeInput.value.length === 4) {
    roomCode = roomCodeInput.value;
    console.log('Room code stored:', roomCode);
    roomCodeInput.value = `Room Code: ${roomCode}`;
    roomCodeInput.disabled = true;
    document.getElementById('roomcodebutton').style.display = 'none';
    const reference = ref(database, `${roomCode}/players`);
    var position = 0;
    // Check if username already exists and replace if necessary
    onValue(reference, function (snapshot) {
      let newUsername = username;
      if (snapshot.exists()) {
        const pList = Object.values(snapshot.val());
        let count = 1;
        while (pList.includes(newUsername)) {
          count++;
          newUsername = `${username} ${count}`;
          position = pList.length;
        }
        if (roomCode != 'default') {
          document.getElementById('pListDisplay').innerText = pList.join('\n');
        }
      }
      push(reference, newUsername);
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
        document.body.appendChild(startButton);
      }
    }, { onlyOnce: true });

    onValue(reference, function (snapshot) {
      console.log('onValue triggered'); // Debugging statement
      if (snapshot.exists()) {
        const pList = Object.values(snapshot.val());
        console.log('pList updated:', pList);
        if (roomCode != 'default') {
          document.getElementById('pListDisplay').innerText = pList.join('\n');
        }
      } else {
        console.log('No data available');
        document.getElementById('pListDisplay').value = '';
      }
    });
  } else {
    console.log('Username and room code cannot be empty');
  }
}

function startGame() {
  console.log('Start button clicked');
  // Generate 3 random words
  document.getElementById('startButton').style.display = 'none';
  const words = [];
  for (let i = 0; i < 3; i++) {
    const max = toInput.value;
    const min = fromInput.value;
    const num = Math.floor(Math.random() * 303 * (max - min + 1)) + min * 303 - 303;
    words.push(diff[num]);
  }
  console.log('Generated words');

  // Push the generated words to roomCode/games
  const gamesRef = ref(database, `${roomCode}/games`);
  push(gamesRef, words);

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
      if (done) reset();
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
      reset();
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
    const numOfOccurrencesSecret = getNumOfOccurrencesInWord(
      state.secret,
      letter
    );
    const numOfOccurrencesGuess = getNumOfOccurrencesInWord(guess, letter);
    const letterPosition = getPositionOfOccurrence(guess, letter, i);

    if (
      numOfOccurrencesGuess > numOfOccurrencesSecret &&
      letterPosition > numOfOccurrencesSecret
    ) {
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
    document.getElementById("hello").innerText = "you won!";
    done = true;
  } else if (isGameOver) {
    document.getElementById("hello").innerText = "the word was " + state.secret;
    done = true;
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

function startup() {
  document.getElementById("hello").innerText = "Welcome to WordleRacer (WIP)!";
  const game = document.getElementById('game');
  drawGrid(game);

  registerKeyboardEvents();
  // state.secret = "hello";

  updateGrid();

  reset();
}

function reset() {
  var max = toInput.value;
  var min = fromInput.value;
  done = false;

  var num = Math.floor(Math.random() * 303 * (max - min + 1)) + min * 303 - 303;
  state.secret = diff[num];
  state.grid = Array(6)
    .fill()
    .map(() => Array(5).fill(''));
  state.currentRow = 0;
  state.currentCol = 0;
  document.getElementById("hello").innerText = "Welcome to WordleRacer (WIP)!";
  document.getElementById("diff").innerText = "Difficulty: " + (Math.floor(num / 303) + 1) + "/19 ";

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      const box = document.getElementById(`box${i}${j}`);
      box.classList.remove("right");
      box.classList.remove("wrong");
      box.classList.remove("empty");
    }
  }
}

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#C6C6C6', '#08b0d1', controlSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#C6C6C6', '#08b0d1', controlSlider);
  setToggleAccessible(toInput);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
  }
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#08b0d1', toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
}

function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#08b0d1', toSlider);
  setToggleAccessible(toSlider);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
    toSlider.value = from;
  }
}

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max - to.min;
  const fromPosition = from.value - to.min;
  const toPosition = to.value - to.min;
  controlSlider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${(fromPosition) / (rangeDistance) * 100}%,
    ${rangeColor} ${((fromPosition) / (rangeDistance)) * 100}%,
    ${rangeColor} ${(toPosition) / (rangeDistance) * 100}%, 
    ${sliderColor} ${(toPosition) / (rangeDistance) * 100}%, 
    ${sliderColor} 100%)`;
}

function setToggleAccessible(currentTarget) {
  const toSlider = document.querySelector('#toSlider');
  if (Number(currentTarget.value) <= 0 || toInput.value == 1) {
    toSlider.style.zIndex = 2;
  } else {
    toSlider.style.zIndex = 0;
  }
}

const fromSlider = document.querySelector('#fromSlider');
const toSlider = document.querySelector('#toSlider');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');
fillSlider(fromSlider, toSlider, '#C6C6C6', '#08b0d1', toSlider);
setToggleAccessible(toSlider);

fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider);
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);


startup();
