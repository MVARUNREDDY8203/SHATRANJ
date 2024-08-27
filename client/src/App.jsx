import React, { useState, useEffect } from "react";
import Board from "./components/Board";
import "./App.css";
const WebSocketURL = "ws://localhost:8080";
// const WebSocketURL = "wss://shatranjh.onrender.com/";

const App = () => {
    const [ws, setWs] = useState(null);
    const [roomCode, setRoomCode] = useState("");
    const [playerType, setPlayerType] = useState("");
    const [pieces, setPieces] = useState("");
    const [gameState, setGameState] = useState(null);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);
    const [waitingForSetup, setWaitingForSetup] = useState(true);
    const [error, setError] = useState("");
    const [winner, setWinner] = useState(null);

    const handleChange = (e) => {
        const value = e.target.value;
        if (value.length <= 5) {
            setPieces(value.toUpperCase());
            setError("");
        } else {
            setError("Please enter no more than 5 characters.");
        }
    };

    useEffect(() => {
        const socket = new WebSocket(WebSocketURL);
        setWs(socket);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "ROOM_CODE":
                    setRoomCode(data.code);
                    setPlayerType("A");
                    setWaitingForOpponent(true);
                    break;
                case "JOINED_ROOM":
                    setPlayerType("B");
                    setWaitingForOpponent(false);
                    break;
                case "OPPONENT_JOINED":
                    setWaitingForOpponent(false);
                    break;
                case "OPPONENT_SETUP_COMPLETE":
                    setWaitingForSetup(false);
                    break;
                case "START_GAME":
                    setWaitingForSetup(false);
                    console.log(data.gameState);
                    setGameState(data.gameState);
                    break;
                case "UPDATED_GAMESTATE":
                    setGameState(data.gameState);
                    break;
                case "GAME_OVER":
                    setGameState(data.gameState);
                    setWinner(data.winner);
                    break;
                default:
                    console.log("Unknown message type:", data.type);
            }
        };

        return () => socket.close();
    }, []);

    const createRoom = () => {
        ws.send(JSON.stringify({ type: "CREATE_ROOM" }));
    };

    const joinRoom = (code) => {
        ws.send(JSON.stringify({ type: "JOIN_ROOM", code }));
    };

    // send server our init config of the board
    const setupPieces = () => {
        for (let i = 0; i < 5; i++) {
            if (pieces[i] != "P" && pieces[i] != "Q" && pieces[i] != "R") {
                alert("select chars only between p / q / r");
                return;
            }
        }
        ws.send(JSON.stringify({ type: "SETUP_PIECES", pieces }));
    };

    return (
        <div className='shatranj-container'>
            <h1>SHATRANJ</h1>
            {/* INTIIAL STATE / LANDING STATE - CREATE/ JOIN ROOM */}
            {playerType === "" && (
                <div className='room-setup-container'>
                    <input
                        type='text'
                        placeholder='Room Code'
                        onChange={(e) => setRoomCode(e.target.value)}
                    />
                    <div className='button-container'>
                        <button onClick={createRoom}>Create Room</button>
                        <button onClick={() => joinRoom(roomCode)}>
                            Join Room
                        </button>
                    </div>
                </div>
            )}
            {/* A HAS JOINED, WAITING FOR B + WAITING FOR SETUP */}
            {roomCode && waitingForSetup && (
                <div>
                    <p>Your room code: {roomCode}</p>
                    {waitingForOpponent ? (
                        <p>Waiting for opponent to join...</p>
                    ) : (
                        <p>Setup your pieces below:</p>
                    )}
                </div>
            )}
            {/* player A or B has joined the room and need to select pieces config */}
            {playerType !== "" && !waitingForOpponent && (
                <div className='pieces-setup-container'>
                    {!gameState && (
                        <>
                            <p>
                                Enter your pieces configuration (e.g., pppqr).
                                YOU CAN CHOOSE ANY CONFIGURATION OF P / Q / R
                            </p>
                            <input
                                type='text'
                                placeholder='pppqr'
                                value={pieces}
                                onChange={handleChange}
                                maxLength='5'
                            />
                        </>
                    )}
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    {!gameState && (
                        <button onClick={setupPieces}>Submit Setup</button>
                    )}
                </div>
            )}
            {playerType === "B" && waitingForOpponent && (
                <p>Waiting for opponent to set up pieces...</p>
            )}
            {/* actual game here */}
            {!waitingForOpponent && !waitingForSetup && gameState && (
                <>
                    {playerType && <p>You are playing as : {playerType}</p>}
                    {winner && playerType === winner && <p>You Won!!!</p>}
                    {winner && playerType != winner && <p>You Lost</p>}
                    {!winner && <p>current turn: {gameState.turn}</p>}
                    <Board
                        gameState={gameState}
                        currentPlayer={playerType}
                        ws={ws}
                    />
                </>
            )}
        </div>
    );
};

export default App;
