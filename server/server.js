const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

const rooms = {};

server.on("connection", (ws) => {
    let roomCode = null;
    let playerType = null;

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        console.log(playerType, data);
        switch (data.type) {
            case "CREATE_ROOM":
                roomCode = generateRoomCode();

                rooms[roomCode] = {
                    players: { A: null, B: null },
                    gameState: {
                        board: [
                            [null, null, null, null, null],
                            [null, null, null, null, null],
                            [null, null, null, null, null],
                            [null, null, null, null, null],
                            [null, null, null, null, null],
                        ],
                        turn: "A",
                        A_cnt: 0,
                        B_cnt: 0,
                    },
                    setupComplete: { A: false, B: false },
                };

                playerType = "A";

                rooms[roomCode].players["A"] = ws;
                ws.send(JSON.stringify({ type: "ROOM_CODE", code: roomCode }));
                break;

            case "JOIN_ROOM":
                roomCode = data.code;
                if (rooms[roomCode] && !rooms[roomCode].players.B) {
                    rooms[roomCode].players.B = ws;
                    playerType = "B";
                    rooms[roomCode].setupComplete.B = false; // Make sure setup is not completed yet
                    rooms[roomCode].players.A.send(
                        JSON.stringify({ type: "OPPONENT_JOINED" })
                    );
                    ws.send(
                        JSON.stringify({ type: "JOINED_ROOM", code: roomCode })
                    );
                } else {
                    ws.send(
                        JSON.stringify({
                            type: "ERROR",
                            message: "Room not available or full.",
                        })
                    );
                }
                break;

            case "SETUP_PIECES":
                // sets up initial board config for each side
                if (
                    rooms[roomCode] &&
                    rooms[roomCode].players[playerType] === ws
                ) {
                    setupBoard(
                        data.pieces,
                        playerType,
                        rooms[roomCode].gameState.board
                    );
                    rooms[roomCode].players[playerType];
                    rooms[roomCode].setupComplete[playerType] = true;

                    if (
                        rooms[roomCode].setupComplete.A &&
                        rooms[roomCode].setupComplete.B
                    ) {
                        // both players completed setup
                        rooms[roomCode].gameState.A_cnt = 5;
                        rooms[roomCode].gameState.B_cnt = 5;
                        rooms[roomCode].players.A.send(
                            JSON.stringify({
                                type: "START_GAME",
                                // board: rooms[roomCode].gameState.board,
                                gameState: rooms[roomCode].gameState,
                            })
                        );
                        rooms[roomCode].players.B.send(
                            JSON.stringify({
                                type: "START_GAME",
                                // board: rooms[roomCode].gameState.board,
                                gameState: rooms[roomCode].gameState,
                            })
                        );
                    } else {
                        let otherPlayerType = playerType === "A" ? "B" : "A";
                        // Notify the opponent that the setup is complete
                        if (rooms[roomCode].players[otherPlayerType]) {
                            rooms[roomCode].players[otherPlayerType].send(
                                JSON.stringify({
                                    type: "OPPONENT_SETUP_COMPLETE",
                                })
                            );
                        }
                    }
                }
                break;

            case "MOVE":
                // validation of the move
                const gameState = rooms[roomCode].gameState;
                const board = gameState.board;
                let x1 = data.move_data.from.row;
                let y1 = data.move_data.from.col;
                let x2 = data.move_data.to.row;
                let y2 = data.move_data.to.col;
                let otherPlayerType = playerType === "A" ? "B" : "A";
                if (isValidMove(playerType, data.move_data, board)) {
                    if (
                        board[x2][y2] != null &&
                        board[x2][y2].startsWith(otherPlayerType)
                    ) {
                        // there is an opponent piece, capture it.
                        //decrement opponent player score
                        if (playerType == "A") {
                            gameState.B_cnt--;
                        } else {
                            gameState.A_cnt--;
                        }
                    }
                    board[x2][y2] = board[x1][y1];
                    board[x1][y1] = null;

                    // is there a winner ?
                    let winner = isThereWinner(gameState);
                    if (winner != "") {
                        // we have a winner
                        rooms[roomCode].players.A.send(
                            JSON.stringify({
                                type: "GAME_OVER",
                                gameState: rooms[roomCode].gameState,
                                winner: winner,
                            })
                        );
                        rooms[roomCode].players.B.send(
                            JSON.stringify({
                                type: "GAME_OVER",
                                gameState: rooms[roomCode].gameState,
                                winner: winner,
                            })
                        );
                    }
                    gameState.turn = otherPlayerType;
                    // send updated gamestate
                    rooms[roomCode].players.A.send(
                        JSON.stringify({
                            type: "UPDATED_GAMESTATE",
                            gameState: rooms[roomCode].gameState,
                        })
                    );
                    rooms[roomCode].players.B.send(
                        JSON.stringify({
                            type: "UPDATED_GAMESTATE",
                            gameState: rooms[roomCode].gameState,
                        })
                    );
                } else {
                    // error invalid move
                }
                // move fucntion
                break;

            default:
                console.log("Unknown message type:", data.type);
        }
    });

    ws.on("close", () => {
        if (roomCode && playerType) {
            delete rooms[roomCode].players[playerType];
            // Optionally notify the remaining player about the disconnection
        }
    });
});
function isThereWinner(gameState) {
    if (gameState.A_cnt == 0) {
        return "B";
    }
    if (gameState.B_cnt == 0) {
        return "A";
    }
    return "";
}
function isValidMove(playerType, move_data, board) {
    // out of bounds checks
    let x1 = move_data.from.row;
    let y1 = move_data.from.col;
    let x2 = move_data.to.row;
    let y2 = move_data.to.col;
    if (
        x1 < 0 ||
        x1 >= 5 ||
        y1 < 0 ||
        y1 >= 5 ||
        x2 < 0 ||
        x2 >= 5 ||
        y2 < 0 ||
        y2 >= 5
    ) {
        // SOME ERROR FUNCTIONALITY
        return;
    }
    // if char is present or no
    if (board[x1][y1] == null) {
        // SOME ERROR FUNCTIONALITY
        return;
    }
    // IS THE PLAYER SENDING REQUEST TO MOVE SELF'S CHAR
    if (!board[x1][y1].startsWith(playerType)) {
        // error
        return;
    }
    // if the move is possible with the character type
    const piece = board[x1][y1].split("-")[1]; // Extract P, Q, or R from "A-P"
    // Determine if the move is valid based on the character type
    switch (piece) {
        case "P":
            // Moves one block in any direction (Left, Right, Forward, or Backward)
            return (
                (x2 === x1 && Math.abs(y2 - y1) === 1) || // Horizontal move
                (y2 === y1 && Math.abs(x2 - x1) === 1) // Vertical move
            );
        case "Q":
            // Moves two blocks straight in any direction
            return (
                (x2 === x1 &&
                    Math.abs(y2 - y1) <= 2 &&
                    Math.abs(y2 - y1) != 0) || // Horizontal move
                (y2 === y1 && Math.abs(x2 - x1) <= 2 && Math.abs(x2 - x1) != 0) // Vertical move
            );
        case "R":
            // Moves two blocks diagonally in any direction
            return (
                Math.abs(x2 - x1) <= 2 &&
                Math.abs(y2 - y1) <= 2 &&
                Math.abs(y2 - y1) != 0 &&
                Math.abs(x2 - x1) != 0 // Diagonal move
            );
        default:
            return false;
    }
}
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function setupBoard(pieces, playerType, board) {
    // func to setup init board config
    pieces.split("").forEach((piece, index) => {
        const row = playerType === "A" ? 4 : 0;
        const col = index;
        board[row][col] = `${playerType}-${piece}`;
    });
}
console.log("WebSocket server is running on ws://localhost:8080");
