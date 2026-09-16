/*
==================================================
  멀티플레이어 오목 게임
==================================================

  최대 4명까지 참여할 수 있습니다.

  Firebase Realtime Database를 이용해서
  여러 컴퓨터의 게임 상태를 실시간으로 공유합니다.

==================================================
*/


// Firebase 기능 가져오기

const {

  database,
  ref,
  set,
  get,
  update,
  onValue

} = window.firebaseGame;


// ===============================
// 기본 설정
// ===============================

const BOARD_SIZE = 19;

const MAX_PLAYERS = 4;


// 현재 플레이어 정보

let myPlayerId = null;

let myNickname = "";

let currentRoomCode = null;

let currentRoom = null;


// ===============================
// HTML 요소
// ===============================

const lobby =
  document.getElementById("lobby");

const waitingRoom =
  document.getElementById("waitingRoom");

const gameScreen =
  document.getElementById("gameScreen");

const nicknameInput =
  document.getElementById("nickname");

const roomCodeInput =
  document.getElementById("roomCodeInput");

const createRoomButton =
  document.getElementById("createRoomButton");

const joinRoomButton =
  document.getElementById("joinRoomButton");

const startGameButton =
  document.getElementById("startGameButton");

const lobbyMessage =
  document.getElementById("lobbyMessage");

const waitingMessage =
  document.getElementById("waitingMessage");

const roomCodeDisplay =
  document.getElementById("roomCodeDisplay");

const playerList =
  document.getElementById("playerList");

const gameRoomCode =
  document.getElementById("gameRoomCode");

const myNicknameElement =
  document.getElementById("myNickname");

const turnText =
  document.getElementById("turnText");

const hintBox =
  document.getElementById("hintBox");

const hint1 =
  document.getElementById("hint1");

const hint2 =
  document.getElementById("hint2");

const boardElement =
  document.getElementById("board");

const resultBox =
  document.getElementById("resultBox");

const resultTitle =
  document.getElementById("resultTitle");

const resultText =
  document.getElementById("resultText");


// ===============================
// 화면 전환
// ===============================

function showScreen(screen) {

  lobby.classList.add("hidden");

  waitingRoom.classList.add("hidden");

  gameScreen.classList.add("hidden");

  screen.classList.remove("hidden");

}


// ===============================
// 방 코드 생성
// ===============================

function generateRoomCode() {

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {

    const randomIndex =
      Math.floor(
        Math.random() *
        characters.length
      );

    code += characters[randomIndex];

  }

  return code;

}


// ===============================
// 플레이어 ID 생성
// ===============================

function generatePlayerId() {

  return (
    "player_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );

}


// ===============================
// 빈 오목판 만들기
// ===============================

function createEmptyBoard() {

  const board = [];

  for (let row = 0; row < BOARD_SIZE; row++) {

    board[row] = [];

    for (
      let col = 0;
      col < BOARD_SIZE;
      col++
    ) {

      board[row][col] = null;

    }

  }

  return board;

}


// ===============================
// 초기 흰돌 생성
// ===============================

function createInitialStones(count) {

  /*
    초기 돌은 일직선으로 생성합니다.

    방향:
    0 = 가로
    1 = 세로
    2 = 대각선 \
    3 = 대각선 /
  */

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  while (true) {

    const direction =
      directions[
        Math.floor(
          Math.random() *
          directions.length
        )
      ];


    const dr = direction[0];

    const dc = direction[1];


    /*
      초기 돌은 반드시
      가장자리(row 0, row 18,
      col 0, col 18)를 피해야 합니다.

      그래서 시작점을 1~17 사이에서 선택합니다.
    */

    let startRow =
      Math.floor(
        Math.random() * 17
      ) + 1;

    let startCol =
      Math.floor(
        Math.random() * 17
      ) + 1;


    const endRow =
      startRow +
      dr * (count - 1);

    const endCol =
      startCol +
      dc * (count - 1);


    /*
      끝점도 가장자리 밖으로 나가지
      않는지 확인합니다.
    */

    if (
      endRow < 1 ||
      endRow > 17 ||
      endCol < 1 ||
      endCol > 17
    ) {

      continue;

    }


    const stones = [];


    for (let i = 0; i < count; i++) {

      stones.push({

        row:
          startRow +
          dr * i,

        col:
          startCol +
          dc * i

      });

    }


    return stones;

  }

}


// ===============================
// 초기 돌을 보드에 배치
// ===============================

function createInitialBoard(initialStones) {

  const board =
    createEmptyBoard();


  for (
    const stone of initialStones
  ) {

    board[stone.row][stone.col] =
      "white";

  }


  return board;

}


// ===============================
// 방 생성
// ===============================

createRoomButton.addEventListener(
  "click",
  async () => {

    myNickname =
      nicknameInput.value.trim();


    if (!myNickname) {

      lobbyMessage.textContent =
        "닉네임을 입력해주세요.";

      return;

    }


    myPlayerId =
      generatePlayerId();


    let roomCode;


    /*
      혹시 같은 방 코드가 존재하는지
      확인합니다.
    */

    while (true) {

      roomCode =
        generateRoomCode();

      const roomRef =
        ref(
          database,
          "rooms/" + roomCode
        );

      const snapshot =
        await get(roomRef);


      if (!snapshot.exists()) {

        break;

      }

    }


    currentRoomCode =
      roomCode;


    /*
      처음 방을 만들 때는
      방장 1명만 존재합니다.
    */

    const room = {

      hostId:
        myPlayerId,

      status:
        "waiting",

      phase:
        "waiting",

      currentTurn:
        0,

      players: {

        [myPlayerId]: {

          nickname:
            myNickname,

          order:
            0

        }

      },

      guesses: {},

      initialStones: [],

      board:
        createEmptyBoard(),

      result:
        null

    };


    await set(
      ref(
        database,
        "rooms/" + roomCode
      ),
      room
    );


    enterWaitingRoom();

    listenToRoom();

  }
);


// ===============================
// 방 참가
// ===============================

joinRoomButton.addEventListener(
  "click",
  async () => {

    myNickname =
      nicknameInput.value.trim();

    const roomCode =
      roomCodeInput.value
        .trim()
        .toUpperCase();


    if (!myNickname) {

      lobbyMessage.textContent =
        "닉네임을 입력해주세요.";

      return;

    }


    if (roomCode.length !== 6) {

      lobbyMessage.textContent =
        "6자리 방 코드를 입력해주세요.";

      return;

    }


    const roomRef =
      ref(
        database,
        "rooms/" + roomCode
      );


    const snapshot =
      await get(roomRef);


    if (!snapshot.exists()) {

      lobbyMessage.textContent =
        "존재하지 않는 방입니다.";

      return;

    }


    const room =
      snapshot.val();


    if (room.status !== "waiting") {

      lobbyMessage.textContent =
        "이미 게임이 시작된 방입니다.";

      return;

    }


    const players =
      room.players || {};


    const playerCount =
      Object.keys(players).length;


    if (playerCount >= MAX_PLAYERS) {

      lobbyMessage.textContent =
        "방이 가득 찼습니다.";

      return;

    }


    myPlayerId =
      generatePlayerId();


    currentRoomCode =
      roomCode;


    /*
      새로운 플레이어의 순서를 결정합니다.
    */

    const newPlayerOrder =
      playerCount;


    await update(
      roomRef,
      {

        [`players/${myPlayerId}`]: {

          nickname:
            myNickname,

          order:
            newPlayerOrder

        }

      }
    );


    enterWaitingRoom();

    listenToRoom();

  }
);


// ===============================
// 대기실 들어가기
// ===============================

function enterWaitingRoom() {

  showScreen(waitingRoom);

}


// ===============================
// Firebase 방 데이터 감시
// ===============================

function listenToRoom() {

  const roomRef =
    ref(
      database,
      "rooms/" + currentRoomCode
    );


  onValue(
    roomRef,
    (snapshot) => {

      if (!snapshot.exists()) {

        waitingMessage.textContent =
          "방이 삭제되었습니다.";

        return;

      }


      currentRoom =
        snapshot.val();


      /*
        게임 상태에 따라 화면을 변경합니다.
      */

      if (
        currentRoom.phase ===
        "waiting"
      ) {

        renderWaitingRoom();

      }

      else {

        showScreen(gameScreen);

        renderGame();

      }

    }
  );

}


// ===============================
// 대기실 표시
// ===============================

function renderWaitingRoom() {

  showScreen(waitingRoom);


  roomCodeDisplay.textContent =
    currentRoomCode;


  playerList.innerHTML = "";


  const players =
    currentRoom.players || {};


  const playerArray =
    Object.entries(players)
      .sort(
        (a, b) =>
          a[1].order -
          b[1].order
      );


  playerArray.forEach(
    ([id, player]) => {

      const div =
        document.createElement("div");


      div.className =
        "player-item";


      const name =
        document.createElement("span");


      name.textContent =
        player.nickname;


      const label =
        document.createElement("span");


      if (
        id ===
        currentRoom.hostId
      ) {

        label.textContent =
          "방장";

        label.className =
          "host-label";

      }


      div.appendChild(name);

      div.appendChild(label);

      playerList.appendChild(div);

    }
  );


  /*
    방장에게만 게임 시작 버튼을 표시합니다.
  */

  if (
    myPlayerId ===
    currentRoom.hostId
  ) {

    startGameButton.classList.remove(
      "hidden"
    );


    if (playerArray.length >= 1) {

      waitingMessage.textContent =
        "참가자가 준비되면 게임을 시작하세요.";

    }

  }

  else {

    startGameButton.classList.add(
      "hidden"
    );


    waitingMessage.textContent =
      "방장이 게임을 시작할 때까지 기다려주세요.";

  }

}


// ===============================
// 게임 시작
// ===============================

startGameButton.addEventListener(
  "click",
  async () => {

    /*
      방장만 게임을 시작할 수 있습니다.
    */

    if (
      myPlayerId !==
      currentRoom.hostId
    ) {

      return;

    }


    const players =
      currentRoom.players || {};


    const playerArray =
      Object.entries(players)
        .sort(
          (a, b) =>
            a[1].order -
            b[1].order
        );


    const playerCount =
      playerArray.length;


    /*
      초기 돌 개수

      1명 → 4개
      2명 → 3개
      3명 → 2개
      4명 → 1개
    */

    const initialStoneCount =
      5 - playerCount;


    const initialStones =
      createInitialStones(
        initialStoneCount
      );


    /*
      초기 흰돌을 실제 보드에 배치합니다.
    */

    const board =
      createInitialBoard(
        initialStones
      );


    /*
      게임 시작
    */

    await update(
      ref(
        database,
        "rooms/" +
        currentRoomCode
      ),
      {

        status:
          "playing",

        phase:
          "playing",

        currentTurn:
          0,

        initialStones:
          initialStones,

        board:
          board,

        guesses:
          {},

        result:
          null

      }
    );

  }
);


// ===============================
// 게임 화면 표시
// ===============================

function renderGame() {

  showScreen(gameScreen);


  gameRoomCode.textContent =
    currentRoomCode;


  myNicknameElement.textContent =
    myNickname;


  renderBoard();

  renderTurn();

  renderHints();

  renderResult();

}


// ===============================
// 현재 차례 표시
// ===============================

function renderTurn() {

  const players =
    currentRoom.players || {};


  const playerArray =
    Object.entries(players)
      .sort(
        (a, b) =>
          a[1].order -
          b[1].order
      );


  /*
    게임 종료
  */

  if (
    currentRoom.phase ===
    "finished"
  ) {

    turnText.textContent =
      "게임 종료";

    return;

  }


  const currentPlayer =
    playerArray[
      currentRoom.currentTurn
    ];


  if (!currentPlayer) {

    return;

  }


  const [
    playerId,
    player
  ] =
    currentPlayer;


  if (
    playerId ===
    myPlayerId
  ) {

    turnText.textContent =
      "내 차례입니다.";

  }

  else {

    turnText.textContent =
      player.nickname +
      "님의 차례입니다.";

  }

}


// ===============================
// 힌트 표시
// ===============================

function renderHints() {

  /*
    첫 번째 플레이어는
    이전 위치가 없으므로 힌트가 없습니다.
  */

  if (
    currentRoom.currentTurn ===
    0
  ) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  /*
    게임이 끝난 경우 힌트 제거
  */

  if (
    currentRoom.phase ===
    "finished"
  ) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  /*
    내 차례가 아니면 힌트를
    보여주지 않습니다.
  */

  const players =
    currentRoom.players || {};


  const playerArray =
    Object.entries(players)
      .sort(
        (a, b) =>
          a[1].order -
          b[1].order
      );


  const currentPlayer =
    playerArray[
      currentRoom.currentTurn
    ];


  if (!currentPlayer) {

    return;

  }


  if (
    currentPlayer[0] !==
    myPlayerId
  ) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  /*
    이전 플레이어 찾기
  */

  const previousPlayer =
    playerArray[
      currentRoom.currentTurn - 1
    ];


  if (!previousPlayer) {

    return;

  }


  const previousPlayerId =
    previousPlayer[0];


  const previousGuess =
    currentRoom.guesses?.[
      previousPlayerId
    ];


  if (!previousGuess) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  /*
    힌트 생성
  */

  const hints =
    createHints(
      previousGuess
    );


  hint1.textContent =
    hints[0];

  hint2.textContent =
    hints[1];


  hintBox.classList.remove(
    "hidden"
  );

}


// ===============================
// 진짜 / 가짜 힌트 생성
// ===============================

function createHints(position) {

  /*
    이전 플레이어가 선택한 위치:
    
    row = 세로 좌표
    col = 가로 좌표
  */


  const row =
    position.row + 1;

  const col =
    position.col + 1;


  /*
    가로 또는 세로 중 하나를
    무작위로 선택합니다.
  */

  const useRow =
    Math.random() < 0.5;


  let realHint;

  let fakeHint;


  if (useRow) {

    /*
      진짜 세로 좌표
    */

    realHint =
      "세로 좌표: " +
      row;


    /*
      다른 세로 좌표를 가짜로 생성
    */

    let fakeRow;

    do {

      fakeRow =
        Math.floor(
          Math.random() *
          BOARD_SIZE
        ) + 1;

    }
    while (
      fakeRow === row
    );


    fakeHint =
      "세로 좌표: " +
      fakeRow;

  }

  else {

    /*
      진짜 가로 좌표
    */

    realHint =
      "가로 좌표: " +
      col;


    /*
      다른 가로 좌표를 가짜로 생성
    */

    let fakeCol;

    do {

      fakeCol =
        Math.floor(
          Math.random() *
          BOARD_SIZE
        ) + 1;

    }
    while (
      fakeCol === col
    );


    fakeHint =
      "가로 좌표: " +
      fakeCol;

  }


  /*
    어떤 것이 진짜인지
    표시되지 않도록 순서를 섞습니다.
  */

  if (
    Math.random() < 0.5
  ) {

    return [
      realHint,
      fakeHint
    ];

  }

  else {

    return [
      fakeHint,
      realHint
    ];

  }

}


// ===============================
// 오목판 그리기
// ===============================

function renderBoard() {

  boardElement.innerHTML = "";


  const board =
    currentRoom.board ||
    createEmptyBoard();


  const guesses =
    currentRoom.guesses ||
    {};


  /*
    게임 중에는 선택 위치도 표시합니다.
  */

  const selectedPositions = {};


  Object.entries(guesses)
    .forEach(
      ([playerId, position]) => {

        if (
          position &&
          currentRoom.phase !==
          "finished"
        ) {

          selectedPositions[
            position.row +
            "," +
            position.col
          ] = true;

        }

      }
    );


  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let col = 0;
      col < BOARD_SIZE;
      col++
    ) {

      const cell =
        document.createElement(
          "div"
        );


      cell.className =
        "cell";


      /*
        실제 흰돌이 있는 경우
      */

      if (
        board[row][col] ===
        "white"
      ) {

        const stone =
          document.createElement(
            "div"
          );


        stone.className =
          "stone white-stone";


        cell.appendChild(stone);

      }


      /*
        아직 게임이 끝나지 않았고
        누군가 선택한 위치라면
        선택 표시를 보여줍니다.
      */

      if (
        currentRoom.phase !==
        "finished"
      ) {

        if (
          selectedPositions[
            row + "," + col
          ]
        ) {

          const marker =
            document.createElement(
              "div"
            );


          marker.className =
            "selected-marker";


          cell.appendChild(
            marker
          );

        }

      }


      /*
        현재 내 차례라면
        빈 칸을 클릭할 수 있습니다.
      */

      cell.addEventListener(
        "click",
        () => {

          selectPosition(
            row,
            col
          );

        }
      );


      boardElement.appendChild(
        cell
      );

    }

  }

}


// ===============================
// 위치 선택
// ===============================

async function selectPosition(
  row,
  col
) {

  /*
    게임이 끝났다면 선택 불가능
  */

  if (
    !currentRoom ||
    currentRoom.phase !==
    "playing"
  ) {

    return;

  }


  const players =
    currentRoom.players || {};


  const playerArray =
    Object.entries(players)
      .sort(
        (a, b) =>
          a[1].order -
          b[1].order
      );


  const currentPlayer =
    playerArray[
      currentRoom.currentTurn
    ];


  if (!currentPlayer) {

    return;

  }


  /*
    내 차례가 아니라면 선택 불가능
  */

  if (
    currentPlayer[0] !==
    myPlayerId
  ) {

    alert(
      "현재 내 차례가 아닙니다."
    );

    return;

  }


  const board =
    currentRoom.board;


  /*
    이미 돌이 있는 위치는 선택 불가능
  */

  if (
    board[row][col]
  ) {

    alert(
      "이미 돌이 놓여 있는 위치입니다."
    );

    return;

  }


  /*
    이전 플레이어가 이미 선택한 위치도
    선택하지 못하도록 합니다.
  */

  const guesses =
    currentRoom.guesses || {};


  const alreadySelected =
    Object.values(
      guesses
    ).some(
      position =>
        position &&
        position.row === row &&
        position.col === col
    );


  if (alreadySelected) {

    alert(
      "다른 플레이어가 이미 선택한 위치입니다."
    );

    return;

  }


  /*
    내 선택 위치 저장
  */

  const newGuess = {

    row:
      row,

    col:
      col

  };


  const playerCount =
    playerArray.length;


  const currentTurn =
    currentRoom.currentTurn;


  /*
    마지막 플레이어인지 확인
  */

  const isLastPlayer =
    currentTurn ===
    playerCount - 1;


  const roomRef =
    ref(
      database,
      "rooms/" +
      currentRoomCode
    );


  /*
    마지막 플레이어가 아니라면
    선택 위치만 저장하고 다음 플레이어에게 넘깁니다.
  */

  if (!isLastPlayer) {

    await update(
      roomRef,
      {

        [`guesses/${myPlayerId}`]:
          newGuess,

        currentTurn:
          currentTurn + 1

      }
    );

    return;

  }


  /*
    마지막 플레이어라면
    먼저 마지막 선택 위치를 저장합니다.
  */

  const allGuesses = {

    ...guesses,

    [myPlayerId]:
      newGuess

  };


  /*
    모든 플레이어의 위치를
    보드에 흰돌로 배치합니다.
  */

  const finalBoard =
    JSON.parse(
      JSON.stringify(
        board
      )
    );


  Object.values(
    allGuesses
  )
    .forEach(
      position => {

        if (
          position
        ) {

          finalBoard[
            position.row
          ][
            position.col
          ] =
            "white";

        }

      }
    );


  /*
    오목 완성 여부 확인
  */

  const completed =
    checkGomoku(
      finalBoard
    );


  /*
    결과 메시지
  */

  let resultMessage;


  if (completed) {

    resultMessage =
      "오목이 완성되었습니다!";

  }

  else {

    resultMessage =
      "오목이 완성되지 않았습니다.";

  }


  /*
    게임 종료
  */

  await update(
    roomRef,
    {

      [`guesses/${myPlayerId}`]:
        newGuess,

      board:
        finalBoard,

      phase:
        "finished",

      status:
        "finished",

      result: {

        completed:
          completed,

        message:
          resultMessage

      }

    }
  );

}


// ===============================
// 오목 판정
// ===============================

function checkGomoku(board) {

  /*
    4가지 방향

    가로
    세로
    대각선 \
    대각선 /
  */

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let col = 0;
      col < BOARD_SIZE;
      col++
    ) {

      if (
        board[row][col] !==
        "white"
      ) {

        continue;

      }


      for (
        const direction
        of directions
      ) {

        const dr =
          direction[0];

        const dc =
          direction[1];


        let count = 1;


        let r =
          row + dr;

        let c =
          col + dc;


        while (

          r >= 0 &&
          r < BOARD_SIZE &&
          c >= 0 &&
          c < BOARD_SIZE &&

          board[r][c] ===
            "white"

        ) {

          count++;

          r += dr;

          c += dc;

        }


        if (count >= 5) {

          return true;

        }

      }

    }

  }


  return false;

}


// ===============================
// 결과 표시
// ===============================

function renderResult() {

  if (
    currentRoom.phase !==
    "finished"
  ) {

    resultBox.classList.add(
      "hidden"
    );

    return;

  }


  resultBox.classList.remove(
    "hidden"
  );


  if (
    currentRoom.result?.completed
  ) {

    resultTitle.textContent =
      "🎉 오목 완성!";

    resultText.textContent =
      "모든 선택 위치가 공개되었습니다. 오목이 완성되었습니다.";

  }

  else {

    resultTitle.textContent =
      "게임 종료";

    resultText.textContent =
      "모든 선택 위치가 공개되었습니다. 오목은 완성되지 않았습니다.";

  }

}