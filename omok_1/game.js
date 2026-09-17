/*
==================================================
  멀티플레이어 오목
==================================================

  최대 4명

  Firebase Realtime Database 사용

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
// 방 코드
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
// 플레이어 ID
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
// 빈 오목판
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
// Firebase board 안전 처리
// ===============================

function normalizeBoard(boardData) {

  /*
    Firebase에 board가 없거나
    잘못된 형태일 경우를 대비합니다.
  */

  const board =
    createEmptyBoard();


  if (!boardData) {

    return board;

  }


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

      /*
        배열 형태
      */

      if (
        Array.isArray(boardData) &&
        boardData[row] &&
        boardData[row][col]
      ) {

        board[row][col] =
          boardData[row][col];

      }

      /*
        객체 형태
      */

      else if (
        boardData[row] &&
        boardData[row][col]
      ) {

        board[row][col] =
          boardData[row][col];

      }

    }

  }


  return board;

}


// ===============================
// 초기 흰돌 생성
// ===============================

function createInitialStones(count) {

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


    const dr =
      direction[0];

    const dc =
      direction[1];


    /*
      가장자리 제외

      시작 위치는
      1 ~ 17
    */

    const startRow =
      Math.floor(
        Math.random() * 17
      ) + 1;

    const startCol =
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
      끝점도 1 ~ 17이어야 합니다.
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


    for (
      let i = 0;
      i < count;
      i++
    ) {

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
// 초기 보드 생성
// ===============================

function createInitialBoard(
  initialStones
) {

  const board =
    createEmptyBoard();


  if (!initialStones) {

    return board;

  }


  initialStones.forEach(
    stone => {

      if (
        stone &&
        Number.isInteger(stone.row) &&
        Number.isInteger(stone.col) &&
        stone.row >= 0 &&
        stone.row < BOARD_SIZE &&
        stone.col >= 0 &&
        stone.col < BOARD_SIZE
      ) {

        board[
          stone.row
        ][
          stone.col
        ] = "white";

      }

    }
  );


  return board;

}


// ===============================
// 방 생성
// ===============================

createRoomButton.addEventListener(
  "click",
  async () => {

    try {

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
          "rooms/" +
          roomCode
        ),
        room
      );


      enterWaitingRoom();

      listenToRoom();


    } catch (error) {

      console.error(error);

      lobbyMessage.textContent =
        "방을 만드는 중 오류가 발생했습니다.";

    }

  }
);


// ===============================
// 방 참가
// ===============================

joinRoomButton.addEventListener(
  "click",
  async () => {

    try {

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
          "rooms/" +
          roomCode
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


      if (
        room.status !==
        "waiting"
      ) {

        lobbyMessage.textContent =
          "이미 게임이 시작된 방입니다.";

        return;

      }


      const players =
        room.players || {};


      const playerCount =
        Object.keys(players).length;


      if (
        playerCount >=
        MAX_PLAYERS
      ) {

        lobbyMessage.textContent =
          "방이 가득 찼습니다.";

        return;

      }


      myPlayerId =
        generatePlayerId();


      currentRoomCode =
        roomCode;


      await update(
        roomRef,
        {

          [`players/${myPlayerId}`]: {

            nickname:
              myNickname,

            order:
              playerCount

          }

        }
      );


      enterWaitingRoom();

      listenToRoom();


    } catch (error) {

      console.error(error);

      lobbyMessage.textContent =
        "방에 참가하는 중 오류가 발생했습니다.";

    }

  }
);


// ===============================
// 대기실
// ===============================

function enterWaitingRoom() {

  showScreen(
    waitingRoom
  );

}


// ===============================
// Firebase 실시간 감시
// ===============================

function listenToRoom() {

  const roomRef =
    ref(
      database,
      "rooms/" +
      currentRoomCode
    );


  onValue(
    roomRef,
    snapshot => {

      if (!snapshot.exists()) {

        waitingMessage.textContent =
          "방이 삭제되었습니다.";

        return;

      }


      currentRoom =
        snapshot.val();


      /*
        대기 상태
      */

      if (
        currentRoom.phase ===
        "waiting"
      ) {

        renderWaitingRoom();

        return;

      }


      /*
        게임 상태

        여기서 반드시 게임 화면을
        표시한 후 오목판을 그립니다.
      */

      if (
        currentRoom.phase ===
        "playing" ||
        currentRoom.phase ===
        "finished"
      ) {

        showScreen(
          gameScreen
        );

        renderGame();

      }

    }
  );

}


// ===============================
// 대기실 표시
// ===============================

function renderWaitingRoom() {

  showScreen(
    waitingRoom
  );


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
        document.createElement(
          "div"
        );


      div.className =
        "player-item";


      const name =
        document.createElement(
          "span"
        );


      name.textContent =
        player.nickname;


      const label =
        document.createElement(
          "span"
        );


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


  if (
    myPlayerId ===
    currentRoom.hostId
  ) {

    startGameButton.classList.remove(
      "hidden"
    );


    waitingMessage.textContent =
      "참가자가 준비되면 게임을 시작하세요.";

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

    try {

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


      if (
        playerCount < 1 ||
        playerCount > MAX_PLAYERS
      ) {

        return;

      }


      /*
        초기 돌 개수

        1명 = 4개
        2명 = 3개
        3명 = 2개
        4명 = 1개
      */

      const initialStoneCount =
        5 - playerCount;


      const initialStones =
        createInitialStones(
          initialStoneCount
        );


      /*
        초기 흰돌이 실제로 들어있는
        보드를 생성합니다.
      */

      const initialBoard =
        createInitialBoard(
          initialStones
        );


      /*
        Firebase에 게임 시작 상태 저장
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
            initialBoard,

          guesses:
            {},

          result:
            null

        }
      );


    } catch (error) {

      console.error(
        "게임 시작 오류:",
        error
      );

      alert(
        "게임을 시작하는 중 오류가 발생했습니다."
      );

    }

  }
);


// ===============================
// 게임 화면
// ===============================

function renderGame() {

  showScreen(
    gameScreen
  );


  gameRoomCode.textContent =
    currentRoomCode;


  myNicknameElement.textContent =
    myNickname;


  /*
    중요:
    게임 화면을 표시한 후
    오목판을 생성합니다.
  */

  renderBoard();

  renderTurn();

  renderHints();

  renderResult();

}


// ===============================
// 현재 차례
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

    turnText.textContent =
      "차례 확인 중...";

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
// 힌트
// ===============================

function renderHints() {

  if (
    currentRoom.currentTurn ===
    0
  ) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  if (
    currentRoom.phase ===
    "finished"
  ) {

    hintBox.classList.add(
      "hidden"
    );

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

    hintBox.classList.add(
      "hidden"
    );

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


  const previousPlayer =
    playerArray[
      currentRoom.currentTurn - 1
    ];


  if (!previousPlayer) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


  const previousGuess =
    currentRoom.guesses?.[
      previousPlayer[0]
    ];


  if (!previousGuess) {

    hintBox.classList.add(
      "hidden"
    );

    return;

  }


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
// 힌트 생성
// ===============================

function createHints(position) {

  const row =
    position.row + 1;

  const col =
    position.col + 1;


  const useRow =
    Math.random() < 0.5;


  let realHint;

  let fakeHint;


  if (useRow) {

    realHint =
      "세로 좌표: " +
      row;


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

    realHint =
      "가로 좌표: " +
      col;


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
    진짜/가짜 순서를 무작위로 변경
  */

  if (
    Math.random() < 0.5
  ) {

    return [
      realHint,
      fakeHint
    ];

  }


  return [
    fakeHint,
    realHint
  ];

}


// ===============================
// 오목판
// ===============================

function renderBoard() {

  /*
    혹시 board 요소를 찾지 못하면
    오류를 콘솔에 표시합니다.
  */

  if (!boardElement) {

    console.error(
      "오목판 요소(#board)를 찾을 수 없습니다."
    );

    return;

  }


  /*
    기존 오목판 삭제
  */

  boardElement.innerHTML = "";


  /*
    Firebase 데이터에서
    안전한 19x19 보드 생성
  */

  const board =
    normalizeBoard(
      currentRoom.board
    );


  const guesses =
    currentRoom.guesses || {};


  /*
    플레이어들이 현재 선택한 위치
  */

  const selectedPositions =
    {};


  Object.values(
    guesses
  )
    .forEach(
      position => {

        if (!position) {

          return;

        }


        selectedPositions[
          position.row +
          "," +
          position.col
        ] = true;

      }
    );


  /*
    19 x 19 = 361개의 칸 생성
  */

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
        흰돌 표시
      */

      if (
        board[row] &&
        board[row][col] ===
        "white"
      ) {

        const stone =
          document.createElement(
            "div"
          );


        stone.className =
          "stone white-stone";


        cell.appendChild(
          stone
        );

      }


      /*
        게임 중 선택된 위치 표시
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
        클릭하면 위치 선택
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


  /*
    디버깅용 로그

    개발자 도구에서
    361이 나오면 19x19판이
    정상적으로 만들어진 것입니다.
  */

  console.log(
    "오목판 생성 완료:",
    boardElement.children.length,
    "칸"
  );

}


// ===============================
// 위치 선택
// ===============================

async function selectPosition(
  row,
  col
) {

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
    normalizeBoard(
      currentRoom.board
    );


  /*
    이미 초기 돌이나 다른 돌이
    놓여 있는 곳은 선택 불가능
  */

  if (
    board[row][col] ===
    "white"
  ) {

    alert(
      "이미 돌이 놓여 있는 위치입니다."
    );

    return;

  }


  const guesses =
    currentRoom.guesses || {};


  /*
    다른 플레이어가 선택한 위치인지 확인
  */

  const alreadySelected =
    Object.values(
      guesses
    )
      .some(
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
    아직 마지막 플레이어가 아니라면
    다음 차례로 이동
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
    마지막 플레이어
  */

  const allGuesses = {

    ...guesses,

    [myPlayerId]:
      newGuess

  };


  /*
    현재 보드 복사
  */

  const finalBoard =
    normalizeBoard(
      currentRoom.board
    );


  /*
    모든 플레이어가 선택한 위치에
    흰돌 배치
  */

  Object.values(
    allGuesses
  )
    .forEach(
      position => {

        if (
          position &&
          position.row >= 0 &&
          position.row < BOARD_SIZE &&
          position.col >= 0 &&
          position.col < BOARD_SIZE
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
    오목 검사
  */

  const completed =
    checkGomoku(
      finalBoard
    );


  const resultMessage =
    completed
      ? "오목이 완성되었습니다!"
      : "오목이 완성되지 않았습니다.";


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
// 오목 검사
// ===============================

function checkGomoku(board) {

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


        if (
          count >= 5
        ) {

          return true;

        }

      }

    }

  }


  return false;

}


// ===============================
// 결과
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

