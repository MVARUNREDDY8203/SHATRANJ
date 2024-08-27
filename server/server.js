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
                handleCreateRoom(ws);
                break;

            case "JOIN_ROOM":
                handleJoinRoom(ws, data.code);
                break;

            case "SETUP_PIECES":
                console.log(playerType);
                handleSetupPieces(ws, data.pieces);
                break;

            case "MOVE":
                handleMove(ws, data.move_data);
                break;

            default:
                console.log("Unknown message type:", data.type);
        }
    });

    ws.on("close", () => {
        handleDisconnect();
    });

    function handleCreateRoom(ws) {
        roomCode = generateRoomCode();
        playerType = "A";

        rooms[roomCode] = {
            players: { A: ws, B: null },
            gameState: createInitialGameState(),
            setupComplete: { A: false, B: false },
        };

        ws.send(JSON.stringify({ type: "ROOM_CODE", code: roomCode }));
    }

    function handleJoinRoom(ws, code) {
        roomCode = code;
        const room = rooms[roomCode];

        if (room && !room.players.B) {
            room.players.B = ws;
            playerType = "B";
            room.setupComplete.B = false;

            room.players.A.send(JSON.stringify({ type: "OPPONENT_JOINED" }));
            ws.send(JSON.stringify({ type: "JOINED_ROOM", code: roomCode }));
        } else {
            ws.send(
                JSON.stringify({
                    type: "ERROR",
                    message: "Room not available or full.",
                })
            );
        }
    }

    function handleSetupPieces(ws, pieces) {
        const room = rooms[roomCode];

        if (room && room.players[playerType] === ws) {
            setupBoard(pieces, playerType, room.gameState.board);
            room.setupComplete[playerType] = true;

            notifySetupComplete(room);

            if (room.setupComplete.A && room.setupComplete.B) {
                startGame(room);
            }
        }
    }

    function handleMove(ws, move_data) {
        const room = rooms[roomCode];
        const gameState = room.gameState;

        if (isValidMove(playerType, move_data, gameState.board)) {
            executeMove(playerType, move_data, gameState);

            const winner = isThereWinner(gameState);
            if (winner) {
                notifyGameOver(room, winner);
            } else {
                switchTurn(gameState);
                notifyUpdatedGameState(room);
            }
        } else {
            // Handle invalid move (e.g., send an error message)
        }
    }

    function handleDisconnect() {
        if (roomCode && playerType) {
            delete rooms[roomCode].players[playerType];
            // Optionally notify the remaining player about the disconnection
        }
    }
    function createInitialGameState() {
        return {
            board: Array.from({ length: 5 }, () => Array(5).fill(null)),
            turn: "A",
            A_cnt: 0,
            B_cnt: 0,
        };
    }

    function setupBoard(pieces, playerType, board) {
        pieces.split("").forEach((piece, index) => {
            const row = playerType === "A" ? 4 : 0;
            const col = index;
            board[row][col] = `${playerType}-${piece}`;
        });
    }

    function isValidMove(playerType, move_data, board) {
        const { from, to } = move_data;
        const [x1, y1] = [from.row, from.col];
        const [x2, y2] = [to.row, to.col];

        if (!isWithinBounds(x1, y1) || !isWithinBounds(x2, y2)) return false;
        if (!board[x1][y1] || !board[x1][y1].startsWith(playerType))
            return false;

        const piece = board[x1][y1].split("-")[1];
        return isMoveValidForPiece(piece, x1, y1, x2, y2);
    }

    function isMoveValidForPiece(piece, x1, y1, x2, y2) {
        switch (piece) {
            case "P":
                return (
                    (x2 === x1 && Math.abs(y2 - y1) === 1) ||
                    (y2 === y1 && Math.abs(x2 - x1) === 1)
                );
            case "Q":
                return (
                    (x2 === x1 &&
                        Math.abs(y2 - y1) <= 2 &&
                        Math.abs(y2 - y1) !== 0) ||
                    (y2 === y1 &&
                        Math.abs(x2 - x1) <= 2 &&
                        Math.abs(x2 - x1) !== 0)
                );
            case "R":
                return (
                    Math.abs(x2 - x1) <= 2 &&
                    Math.abs(y2 - y1) <= 2 &&
                    Math.abs(x2 - x1) === Math.abs(y2 - y1)
                );
            default:
                return false;
        }
    }

    function isWithinBounds(x, y) {
        return x >= 0 && x < 5 && y >= 0 && y < 5;
    }

    function executeMove(playerType, move_data, gameState) {
        const { from, to } = move_data;
        const [x1, y1] = [from.row, from.col];
        const [x2, y2] = [to.row, to.col];

        const board = gameState.board;
        const otherPlayerType = playerType === "A" ? "B" : "A";

        if (board[x2][y2] && board[x2][y2].startsWith(otherPlayerType)) {
            if (playerType === "A") {
                gameState.B_cnt--;
            } else {
                gameState.A_cnt--;
            }
        }

        board[x2][y2] = board[x1][y1];
        board[x1][y1] = null;
    }

    function switchTurn(gameState) {
        gameState.turn = gameState.turn === "A" ? "B" : "A";
    }

    function isThereWinner(gameState) {
        if (gameState.A_cnt === 0) return "B";
        if (gameState.B_cnt === 0) return "A";
        return "";
    }

    function notifySetupComplete(room) {
        console.log(playerType);
        console.log(playerType === "A" ? "B" : "A");
        const otherPlayerType = playerType === "A" ? "B" : "A";
        if (room.players[otherPlayerType]) {
            room.players[otherPlayerType].send(
                JSON.stringify({ type: "OPPONENT_SETUP_COMPLETE" })
            );
        }
    }

    function startGame(room) {
        const gameState = room.gameState;
        gameState.A_cnt = 5;
        gameState.B_cnt = 5;

        room.players.A.send(JSON.stringify({ type: "START_GAME", gameState }));
        room.players.B.send(JSON.stringify({ type: "START_GAME", gameState }));
    }

    function notifyUpdatedGameState(room) {
        room.players.A.send(
            JSON.stringify({
                type: "UPDATED_GAMESTATE",
                gameState: room.gameState,
            })
        );
        room.players.B.send(
            JSON.stringify({
                type: "UPDATED_GAMESTATE",
                gameState: room.gameState,
            })
        );
    }

    function notifyGameOver(room, winner) {
        room.players.A.send(
            JSON.stringify({
                type: "GAME_OVER",
                gameState: room.gameState,
                winner,
            })
        );
        room.players.B.send(
            JSON.stringify({
                type: "GAME_OVER",
                gameState: room.gameState,
                winner,
            })
        );
    }
});

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}

console.log("WebSocket server is running on ws://localhost:8080");
