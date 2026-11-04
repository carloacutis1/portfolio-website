function render() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';                    // clear old tiles
    board.forEach(value => {
        const cell = document.createElement('div');
        cell.className = `cell val-${value}`;
        cell.textContent = value !== 0 ? value : '';
        grid.appendChild(cell);
    });
    document.getElementById('score').textContent = score;
}

function spawnTile() {

    // pick a random empty cell, place a 2 or 4

    // create an array with only the 'indices' of the empty tiles 
    let emptySpaces = [];
    for (let i = 0; i < board.length; i++) {
        if (board[i] === 0) {   
            // if a board space is empty, append its index
            emptySpaces.push(i);
        }
    }
    // now we can randomly select a spot from this array
    let cell = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
    
    // set the board at the selected empty board index to a 2 or 4
    // 2s spawn 90% and 4s spawn 10%

    let num = Math.random() < 0.1 ? 4 : 2;  // 10% chance of a 4, otherwise a 2

    // update the cell
    board[cell] = num;
}

function rotate(b) {
    // create a blank board
    let result = Array(16).fill(0);
    // loop through rows
    for (let row = 0; row < 4; row++) {
        // loop through columns
        for (let col = 0; col < 4; col++) {
            // set new board 
            result[col * 4 + (3 - row)] = b[row * 4 + col];
        }
    }
    // return the result
    return result;
}

function swipe(dir) {
    // user swipes in a direction

    // number of times the table needs to rotate to compress to the left
    let rot = { left: 0, down: 1, right: 2, up: 3 }[dir];   // map each string to a numerical value

    if (rot < 0 || rot > 3) return;     // if you swipe left, no rotation needs to be done

    let b = [...board];     // copy the board into b

    // rotate the number of times it needs to
    for (let i = 0; i < rot; i++) b = rotate(b);

    // compress to the left!
    b = compress(b);

    // rotate back to how it was;
    for (let i = 0; i < (4 - rot) % 4; i++) b = rotate(b);

    // set the board equal to the new board
    board = b;
}

function compress(b) {
    // compress rows to the left

    let compBoard = [];
    let row = [];
    let compRow = [];

    // go by row
    for (let i = 0; i < Math.sqrt(b.length); i++) { // loop through the rows
        row = b.slice(i * 4, 4 * (i + 1));          // grab each row, 1 by 1
        compRow = compressRow(row);                 // compress the row
        compBoard = [...compBoard, ...compRow];     // append the compressed row to a new board
    }
    return compBoard;                               // return the new board
}

function compressRow(row) {

    // filter zeros to the right ============================

    let compressedRow = [0, 0, 0, 0];   // array of zeros for later
    let tempRow = [], tempRow2 = []
   
    // get non zero elements into proper places of array
    for (let i = 0; i < row.length; i++) {  // loop through the values in the row
        if (row[i] > 0) {                   // if they aren't 0 ...
            tempRow.push(row[i]);           // ...append them to a temporary array
        }
    }

    // tempRow contains all non-zero elements

    // if adjacent nums, merge

    // loop through tempRow
    // if i == i+1 then write their sum to tempRow2

    for (let i = 0; i < tempRow.length; i++) {  // loop through non-zero elements
        if (!(i + 1 === tempRow.length)) {      // catch index errors at the end of the row
            if (tempRow[i] === tempRow[i + 1]) {// if there are adjacent tiles of the same value
                tempRow2.push(tempRow[i] * 2);  // add the multiplied value to another array
                score += tempRow[i] * 2;        // the merged tile's value is added to the score
                tempRow[i] = tempRow[i + 1] = 0;// set the two values to zero to avoid double counting
                i++;                            // skip the next value to avoid adding 0 to tempRow2
                continue;                       // skip to the next iteration to ensure ....
            } 
        }
        tempRow2.push(tempRow[i]);              // ...this line is only run at the end
    }

    // write the non-zero values to their correct places in the array of zeros 
    for (let i = 0; i < compressedRow.length; i++) {            // loop through the 0-filled array
        if (i < tempRow2.length) compressedRow[i] = tempRow2[i];// if i is within bounds, replace the
    }                                                           // zero with the value

    return compressedRow;   // finally return the compressed row
}

function checkWin() {
    // checks if the tile 2048 exists

    if (board.includes(2048)) return true;
    return false;
}

function checkGameOver() {
    // the game is over when there are no valid moves left, returns t/f

    // if there is an empty tile, the player can still move
    if (board.includes(0)) return false;

    // the board is full, so look for two equal tiles next to each other
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            let i = row * 4 + col;
            if (col < 3 && board[i] === board[i + 1]) return false; // equal tile to the right
            if (row < 3 && board[i] === board[i + 4]) return false; // equal tile below
        }
    }

    // no empty tiles and no possible merges
    return true;
}

function newGame() {
    // reset everything and start with two tiles
    board = Array(16).fill(0);
    prevBoard = [];
    prevScore = 0;
    score = 0;
    ignoreWin = false;

    spawnTile();
    spawnTile();
    render();
}

let validResponses = ['z', 'w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
let board = [];
let prevBoard = [];
let score = 0;
let prevScore = 0;
let ignoreWin = false;

// set up the first game
newGame();

// on a key press, run the game loop
document.addEventListener('keydown', function(event) {
    // player swipes

    // we only want to do things in the game on a valid key press
    if (validResponses.includes(event.key)) {

        // stop the arrow keys from scrolling the page
        event.preventDefault();

        // step back one move for debugging (only once a move has been made)
        if (event.key === 'z') {
            if (prevBoard.length === 16) {
                board = [...prevBoard];
                score = prevScore;
                render();
            }
            return;
        }

        // remember the board and score before the swipe, so we can tell
        // whether the board changed and so 'z' can undo the move
        let beforeBoard = board;
        let beforeScore = score;

        // pass each key press into the swipe function
        // (the score is updated inside compressRow as tiles merge)
        if      (event.key === 'ArrowUp'    || event.key === 'w') swipe('up');
        else if (event.key === 'ArrowDown'  || event.key === 's') swipe('down');
        else if (event.key === 'ArrowLeft'  || event.key === 'a') swipe('left');
        else if (event.key === 'ArrowRight' || event.key === 'd') swipe('right');

        // spawn in a new tile after a valid swipe
        let boardChanged = false;
        for (let i = 0; i < board.length; i++) {
            if (beforeBoard[i] !== board[i]) { boardChanged = true; break; }
        }
        if (!boardChanged) return;  // nothing moved, so nothing else to do

        prevBoard = beforeBoard;
        prevScore = beforeScore;
        spawnTile();

        // push changes to the web page
        render();

        // wait a moment so the browser draws the board before the alert pops up
        setTimeout(function() {
            // check if the player wins (only announce it once per game)
            if (!ignoreWin && checkWin()) {
                ignoreWin = true;
                alert('You Win!');
            }

            // check if the player has no moves left
            if (checkGameOver()) alert('Game Over! Score: ' + score);
        }, 50);
    }
});
