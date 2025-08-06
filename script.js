// Multiplayer variables
const socket = new WebSocket('wss://centurion-backend.onrender.com'); // Replace with your actual Render URL
let myPlayerId = null;
let isMyTurn = false;
let multiplayerMode = true; // toggle if needed

socket.onopen = () => {
  console.log("Connected to WebSocket server");
};

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'init') {
    myPlayerId = msg.player;
    isMyTurn = (myPlayerId === 2); // White starts
    updateTurnDisplay();
  } else if (msg.type === 'move') {
    const { from, to } = msg;
    movePiece(from.r, from.c, to.r, to.c, false); // false = do not send again
    isMyTurn = true;
    updateTurnDisplay();
  }
};

// Modified movePiece to accept send = true/false
function movePiece(r1, c1, r2, c2, sendMove = true) {
  const piece = board[r1][c1];
  const target = board[r2][c2];

  // Handle captures
  if (target) {
    addPointsForCapture(target);
    if (target.type === 'K') {
      renderBoard();
      setTimeout(() => {
        alert(`King captured! Player ${piece.player === 1 ? 'Black' : 'White'} wins round ${round}.`);
        endRound();
      }, 100);
      boardElement.style.pointerEvents = 'none';
      return;
    }
  }

  board[r2][c2] = piece;
  board[r1][c1] = null;

  // Pawn promotion
  if (piece.type === 'P' && (r2 === 0 || r2 === boardSize - 1)) {
    showPromotionModal(r2, c2);
  } else {
    switchPlayer();
  }

  renderBoard();

  // Send move over WebSocket
  if (multiplayerMode && sendMove && myPlayerId !== null) {
    socket.send(JSON.stringify({ type: 'move', from: { r: r1, c: c1 }, to: { r: r2, c: c2 } }));
    isMyTurn = false;
    updateTurnDisplay();
  }
}

// Block move input when it's not your turn
function onSquareClick(r, c) {
  if (!isMyTurn && multiplayerMode) return;

  const clickedPiece = board[r][c];

  if (!selectedPiece) {
    if (clickedPiece && clickedPiece.player === currentPlayer) {
      selectedPiece = { r, c, piece: clickedPiece };
      validMoves = getValidMoves(r, c);
      renderBoard();
    }
    return;
  }

  // Handle special diplomat logic here if needed (same as before)

  if (validMoves.some(m => m[0] === r && m[1] === c)) {
    movePiece(selectedPiece.r, selectedPiece.c, r, c);
    selectedPiece = null;
    validMoves = [];
    renderBoard();
    return;
  }

  if (clickedPiece && clickedPiece.player === currentPlayer) {
    selectedPiece = { r, c, piece: clickedPiece };
    validMoves = getValidMoves(r, c);
    renderBoard();
    return;
  }

  selectedPiece = null;
  validMoves = [];
  renderBoard();
}


console.log("script loaded"); // Confirm script runs
const boardElement = document.getElementById('board');
const turnDisplay = document.getElementById('turnDisplay');
const promotionModal = document.getElementById('promotionModal');
const promotionOptions = document.getElementById('promotionOptions');

const boardSize = 10;

let board = [];
let selectedPiece = null;
let currentPlayer = 2; // 1 = Black, 2 = White
let validMoves = [];
let moveTimeSeconds = 30; // seconds per move
let timeLeft = moveTimeSeconds;
let timerId = null;
const timerDisplay = document.getElementById('timerDisplay');

let blackPoints = 0;
let whitePoints = 0;
const blackPointsDisplay = document.getElementById('blackPoints');
const whitePointsDisplay = document.getElementById('whitePoints');

// Assign points for each piece type
const piecePoints = {
  K: 20, // King
  Q: 12, // Queen
  R: 4,  // Rook
  B: 4,  // Bishop
  N: 3,  // Knight
  A: 3,  // Archer
  W: 6,  // Diplomat
  P: 1   // Pawn
};

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnDisplay();
  resetTimer();
}
const piecesUnicode = {
  P: '♟', // Pawn
  R: '♜', // Rook
  N: '♞', // Knight
  B: '♝', // Bishop
  Q: '♛', // Queen
  K: '♚', // King
  A: 'A', // Archer
  W: 'D'  // Diplomat
};

function createEmptyBoard() {
  board = [];
  for(let r=0; r<boardSize; r++){
    const row = [];
    for(let c=0; c<boardSize; c++){
      row.push(null);
    }
    board.push(row);
  }
}

function setupPieces() {
  // Black side (player 1) top rows
  const blackPiecesRow = [
    {type:'R'}, {type:'N'}, {type:'B'},{type:'W'}, {type:'Q'}, {type:'K'}, {type:'W'}, {type:'B'}, {type:'N'}, {type:'R'}
  ];
  const blackPiecesRow2 = [
    {type:'P'}, {type:'P'}, {type:'P'},{type:'P'}, {type:'A'}, {type:'A'}, {type:'P'}, {type:'P'}, {type:'P'}, {type:'P'}
  ];
  for(let c=0; c<boardSize; c++) {
    board[0][c] = {...blackPiecesRow[c], player:1};
    board[1][c] = {...blackPiecesRow2[c], player:1};
  }

  // White side (player 2) bottom rows
  const whitePiecesRow = [
    {type:'R'}, {type:'N'}, {type:'B'},{type:'W'}, {type:'Q'}, {type:'K'}, {type:'W'}, {type:'B'}, {type:'N'}, {type:'R'} ]
    const WhitePiecesRow2 = [
    {type:'P'}, {type:'P'}, {type:'P'},{type:'P'}, {type:'A'}, {type:'A'}, {type:'P'}, {type:'P'}, {type:'P'}, {type:'P'}
  ];
  for(let c=0; c<boardSize; c++) {
    board[9][c] = {...whitePiecesRow[c], player:2};
    board[8][c] = {...WhitePiecesRow2[c], player:2};
  }
}

function renderBoard() {
  boardElement.innerHTML = '';
  for(let r=0; r<boardSize; r++){
    for(let c=0; c<boardSize; c++){
      const sq = document.createElement('div');
      sq.classList.add('square');
      sq.classList.add( (r+c) % 2 === 0 ? 'light' : 'dark' );
      sq.dataset.row = r;
      sq.dataset.col = c;

      const piece = board[r][c];
      if(piece){
        sq.textContent = piecesUnicode[piece.type];
        sq.style.color = piece.player === 1 ? 'black' : 'white';
      }

      // Highlight selected
      if(selectedPiece && selectedPiece.r === r && selectedPiece.c === c){
        sq.classList.add('highlight');
      }

      // Show valid move dots
      if(validMoves.some(m => m[0] === r && m[1] === c)){
        const dot = document.createElement('div');
        dot.classList.add('valid-move-dot');
        sq.appendChild(dot);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      boardElement.appendChild(sq);
    }
  }
}

function onSquareClick(r, c) {
  const clickedPiece = board[r][c];

  // If no piece selected yet
  if(!selectedPiece){
    if(clickedPiece && clickedPiece.player === currentPlayer){
      selectedPiece = {r, c, piece: clickedPiece};
      validMoves = getValidMoves(r,c);
      renderBoard();
    }
    return;
  }

  // Diplomat conversion logic (special case)
  if(selectedPiece.piece.type === 'W'){
    // Check if clicked square is adjacent and enemy piece (not king)
    const dr = Math.abs(r - selectedPiece.r);
    const dc = Math.abs(c - selectedPiece.c);
    const target = board[r][c];
    if(
      dr <=1 && dc <=1 &&
      target &&
      target.player !== currentPlayer &&
      target.type !== 'K'
    ){
      // Convert enemy piece to currentPlayer without moving diplomat
      const pts = piecePoints[target.type] || 0;
      // Deduct points from opponent and add to current player
      if (target.player === 1) {
        whitePoints -= pts;
        blackPoints += pts;
      } else if (target.player === 2) {
        blackPoints -= pts;
        whitePoints += pts;
      }
      board[r][c].player = currentPlayer;
      // Switch turn and reset selection
      selectedPiece = null;
      validMoves = [];
      updatePointsDisplay(); // Update the points display
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateTurnDisplay();
      renderBoard();
      return;
    }
  }

  // If clicked on valid move square
  if(validMoves.some(m => m[0] === r && m[1] === c)){
    movePiece(selectedPiece.r, selectedPiece.c, r, c);
    selectedPiece = null;
    validMoves = [];
    renderBoard();
    return;
  }

  // Clicked another own piece => select it
  if(clickedPiece && clickedPiece.player === currentPlayer){
    selectedPiece = {r, c, piece: clickedPiece};
    validMoves = getValidMoves(r, c);
    renderBoard();
    return;
  }

  // Otherwise deselect
  selectedPiece = null;
  validMoves = [];
  renderBoard();
}

function getValidMoves(r, c) {
  const piece = board[r][c];
  if(!piece) return [];

  let moves = [];

  // Find possible moves for each piece type
  for(let rr=0; rr<boardSize; rr++){
    for(let cc=0; cc<boardSize; cc++){
      if(canMove(r,c,rr,cc)){
        moves.push([rr, cc]);
      }
    }
  }
  return moves;
}

function canMove(r1, c1, r2, c2) {
  const piece = board[r1][c1];
  if(!piece) return false;

  const target = board[r2][c2];
  if(target && target.player === piece.player) return false;

  const dr = r2 - r1;
  const dc = c2 - c1;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  switch(piece.type){
    case 'P': return canPawnMove(r1,c1,r2,c2,piece);
    case 'R': return canRookMove(r1,c1,r2,c2);
    case 'N': return canKnightMove(dr,dc);
    case 'B': return canBishopMove(r1,c1,r2,c2);
    case 'Q': return canQueenMove(r1,c1,r2,c2);
    case 'K': return canKingMove(absDr,absDc);
    case 'A': return canArcherMove(r1,c1,r2,c2);
    case 'W': return canDiplomatMove(absDr,absDc);
  }
  return false;
}

function canPawnMove(r1,c1,r2,c2,piece){
  const direction = piece.player === 1 ? 1 : -1;
  const startRow = piece.player === 1 ? 1 : 8;
  const target = board[r2][c2];

  // Move forward 1 if empty
  if(c1 === c2 && r2 === r1 + direction && !target) return true;

  // Move forward 2 if at start and path clear
  if(c1 === c2 && r1 === startRow && r2 === r1 + 2*direction && !target && !board[r1 + direction][c1]) return true;

  // Capture diagonally
  if(Math.abs(c2 - c1) === 1 && r2 === r1 + direction && target && target.player !== piece.player) return true;

  return false;
}

function canRookMove(r1,c1,r2,c2){
  if(r1 !== r2 && c1 !== c2) return false;
  if(isPathBlocked(r1,c1,r2,c2)) return false;
  return true;
}

function canKnightMove(dr, dc){
  return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) ===1 && Math.abs(dc) === 2);
}

function canBishopMove(r1,c1,r2,c2){
  if(Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return false;
  if(isPathBlocked(r1,c1,r2,c2)) return false;
  return true;
}

function canQueenMove(r1,c1,r2,c2){
  if(r1 === r2 || c1 === c2) return canRookMove(r1,c1,r2,c2);
  if(Math.abs(r2 - r1) === Math.abs(c2 - c1)) return canBishopMove(r1,c1,r2,c2);
  return false;
}

function canKingMove(absDr, absDc){
  return absDr <= 1 && absDc <= 1;
}

function canArcherMove(r1,c1,r2,c2){
  const dr = r2 - r1;
  const dc = c2 - c1;

  // Archer moves or captures exactly 2 squares any direction, jumps over pieces
  if(
    (Math.abs(dr) === 2 && dc === 0) ||
    (Math.abs(dc) === 2 && dr === 0) ||
    (Math.abs(dr) === 2 && Math.abs(dc) === 2)
  ) return true;

  return false;
}

function canDiplomatMove(absDr, absDc){
  // Diplomat moves like king (1 square any direction)
  return absDr <=1 && absDc <=1;
}

function isPathBlocked(r1,c1,r2,c2){
  const dr = Math.sign(r2-r1);
  const dc = Math.sign(c2-c1);
  let r = r1 + dr;
  let c = c1 + dc;

  while(r !== r2 || c !== c2){
    if(board[r][c]) return true;
    r += dr;
    c += dc;
  }
  return false;
}

function movePiece(r1, c1, r2, c2) {
  const piece = board[r1][c1];
  const target = board[r2][c2];

  // Diplomat does not move when converting
  if(piece.type === 'W' && !target && (Math.abs(r2 - r1) <= 1 && Math.abs(c2 - c1) <= 1)) {
    board[r2][c2] = piece;
    board[r1][c1] = null;
  } else if (piece.type === 'W' && target && target.player !== piece.player) {
    return;
  } else {
    // Normal move and capture
    if (target) {
      addPointsForCapture(target);
      if (target.type === 'K') {
        renderBoard();
        setTimeout(() => {
          alert(`King captured! Player ${piece.player === 1 ? 'Black' : 'White'} wins round ${round}.`);
          endRound();
        }, 100);
        boardElement.style.pointerEvents = 'none';
        return;
      }
    }
    board[r2][c2] = piece;
    board[r1][c1] = null;
  }

  // Pawn promotion
  if (piece.type === 'P' && (r2 === 0 || r2 === boardSize - 1)) {
    showPromotionModal(r2, c2);
  } else {
    switchPlayer();
  }
}

function showPromotionModal(r, c){
  promotionModal.style.display = 'flex';
  promotionOptions.innerHTML = '';

  ['Q','R','B','A','N'].forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = piecesUnicode[type];
    btn.onclick = () => {
      board[r][c].type = type;
      promotionModal.style.display = 'none';
      switchPlayer();
      renderBoard();
    };
    promotionOptions.appendChild(btn);
  });
}

function updateTurnDisplay(){
  turnDisplay.textContent = `Turn: ${currentPlayer === 1 ? 'Black' : 'White'}`;
}

const roundNumDisplay = document.getElementById('roundNum');
function updateRoundDisplay() {
  if (roundNumDisplay) roundNumDisplay.textContent = round;
}

// Update points display
function updatePointsDisplay() {
  blackPointsDisplay.textContent = blackPoints;
  whitePointsDisplay.textContent = whitePoints;
}

function updateTotalScoreDisplay() {
  const blackTotalCell = document.getElementById('totalBlackScore');
  const whiteTotalCell = document.getElementById('totalWhiteScore');
  if (blackTotalCell) blackTotalCell.textContent = blackTotalScore;
  if (whiteTotalCell) whiteTotalCell.textContent = whiteTotalScore;
}

// Update points when a piece is captured
function addPointsForCapture(capturedPiece) {
  if (!capturedPiece) return;
  const pts = piecePoints[capturedPiece.type] || 0;
  if (capturedPiece.player === 1) {
    whitePoints += pts;
  } else if (capturedPiece.player === 2) {
    blackPoints += pts;
  }
  updatePointsDisplay();
}

// Move timer
function startTimer() {
  timeLeft = moveTimeSeconds;
  timerDisplay.textContent = `Time Left: ${timeLeft}s`;
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Time Left: ${timeLeft}s`;
    if(timeLeft <= 0){
      clearInterval(timerId);
      alert(`Time's up! Player ${currentPlayer === 1 ? 'Black' : 'White'} loses turn.`);
      switchPlayer();
      selectedPiece = null;
      validMoves = [];
      renderBoard();
    }
  }, 1000);
}

function resetTimer(){
  clearInterval(timerId);
  startTimer();
}

// Init
function initGame(){
  createEmptyBoard();
  setupPieces();
  updateTurnDisplay();
  renderBoard();
  updatePointsDisplay();
  updateTotalScoreDisplay();
  startTimer();
}

let round = 1;
let maxRounds = 4;
let blackTotalScore = 0;
let whiteTotalScore = 0;
let gameEnded = false;

let scoreHistoryArr = [];

function endRound() {
  // Add current round points to total scores
  blackTotalScore += blackPoints;
  whiteTotalScore += whitePoints;

  // Save this round's scores
  scoreHistoryArr.push({
    round: round,
    black: blackPoints,
    white: whitePoints
  });
  updateScoreHistory();
  updateTotalScoreDisplay();

  alert(`Scores after round ${round}:\nBlack: ${blackTotalScore}\nWhite: ${whiteTotalScore}`);

  round++;
  if (round > maxRounds) {
    if (blackTotalScore === whiteTotalScore) {
      alert("Scores are tied! A 5th tie-breaker round will be played.");
      maxRounds = 5;
      resetRound();
    } else {
      gameEnded = true;
      let winner = blackTotalScore > whiteTotalScore ? "Black" : "White";
      alert(`${winner} wins the game!\nFinal Scores:\nBlack: ${blackTotalScore}\nWhite: ${whiteTotalScore}`);
    }
  } else {
    resetRound();
  }
}

function updateScoreHistory() {
  const scoreHistoryDiv = document.getElementById('scoreHistory');
  if (!scoreHistoryDiv) return;
  const tbody = scoreHistoryDiv.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = scoreHistoryArr.map(
    s => `<tr>
      <td style="text-align:center;">${s.round}</td>
      <td style="text-align:center;">${s.black}</td>
      <td style="text-align:center;">${s.white}</td>
    </tr>`
  ).join('');
}

function resetRound() {
  blackPoints = 0;
  whitePoints = 0;
  selectedPiece = null;
  validMoves = [];
  boardElement.style.pointerEvents = 'auto';
  // Alternate starting player each round
  currentPlayer = (round % 2 === 1) ? 2 : 1; // Odd rounds: White starts, Even rounds: Black starts
  initGame();
}

initGame();


