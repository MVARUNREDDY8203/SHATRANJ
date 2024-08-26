import React, { useState } from "react";

const Board = ({ gameState, currentPlayer, ws }) => {
    const [selectedCell, setSelectedCell] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const getValidMoves = (playerChar, row, col) => {
        const moves = [];
        const opponentPrefix = currentPlayer === "A" ? "B" : "A";

        if (playerChar.endsWith("-P")) {
            // P moves one block in any direction
            const directions = [
                { dr: -1, dc: 0 }, // Forward
                { dr: 1, dc: 0 }, // Backward
                { dr: 0, dc: -1 }, // Left
                { dr: 0, dc: 1 }, // Right
            ];

            directions.forEach(({ dr, dc }) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (
                    newRow >= 0 &&
                    newRow < gameState.board.length &&
                    newCol >= 0 &&
                    newCol < gameState.board[0].length
                ) {
                    const targetCell = gameState.board[newRow][newCol];
                    if (!targetCell || targetCell.startsWith(opponentPrefix)) {
                        moves.push({
                            row: newRow,
                            col: newCol,
                            isOpponent:
                                !!targetCell &&
                                targetCell.startsWith(opponentPrefix),
                        });
                    }
                }
            });
        } else if (playerChar.endsWith("-Q")) {
            // Q moves two blocks straight in any direction
            const directions = [
                { dr: -1, dc: 0 }, // Forward
                { dr: 1, dc: 0 }, // Backward
                { dr: 0, dc: -1 }, // Left
                { dr: 0, dc: 1 }, // Right
            ];

            directions.forEach(({ dr, dc }) => {
                for (let step = 1; step <= 2; step++) {
                    const newRow = row + dr * step;
                    const newCol = col + dc * step;
                    if (
                        newRow >= 0 &&
                        newRow < gameState.board.length &&
                        newCol >= 0 &&
                        newCol < gameState.board[0].length
                    ) {
                        const targetCell = gameState.board[newRow][newCol];
                        if (!targetCell) {
                            moves.push({ row: newRow, col: newCol });
                        } else if (targetCell.startsWith(opponentPrefix)) {
                            moves.push({
                                row: newRow,
                                col: newCol,
                                isOpponent: true,
                            });
                            break; // Stop if an opponent is encountered
                        } else {
                            break; // Stop if a friendly piece is encountered
                        }
                    }
                }
            });
        } else if (playerChar.endsWith("-R")) {
            // R moves two blocks diagonally
            const directions = [
                { dr: -1, dc: -1 }, // Forward-Left
                { dr: -1, dc: 1 }, // Forward-Right
                { dr: 1, dc: -1 }, // Backward-Left
                { dr: 1, dc: 1 }, // Backward-Right
            ];

            directions.forEach(({ dr, dc }) => {
                for (let step = 1; step <= 2; step++) {
                    const newRow = row + dr * step;
                    const newCol = col + dc * step;
                    if (
                        newRow >= 0 &&
                        newRow < gameState.board.length &&
                        newCol >= 0 &&
                        newCol < gameState.board[0].length
                    ) {
                        const targetCell = gameState.board[newRow][newCol];
                        if (!targetCell) {
                            moves.push({ row: newRow, col: newCol });
                        } else if (targetCell.startsWith(opponentPrefix)) {
                            moves.push({
                                row: newRow,
                                col: newCol,
                                isOpponent: true,
                            });
                            break; // Stop if an opponent is encountered
                        } else {
                            break; // Stop if a friendly piece is encountered
                        }
                    }
                }
            });
        }

        return moves;
    };

    const handleCellClick = (row, col) => {
        // Check if it's the current player's turn
        if (gameState.turn !== currentPlayer) {
            alert("It's not your turn!");
            return;
        }

        const playerChar = gameState.board[row][col];

        // If a cell is already selected and the clicked cell is a valid move
        if (selectedCell && isValidMove(row, col)) {
            // requesting move validation and gamestate updation
            ws.send(
                JSON.stringify({
                    type: "MOVE",
                    move_data: {
                        from: selectedCell,
                        to: { row: row, col: col },
                    },
                })
            );

            // Clear selection and valid moves
            setSelectedCell(null);
            setValidMoves([]);

            // In a real application, you would notify the server about the move here
            return;
        }

        // If a cell is selected and a different cell is clicked, deselect
        if (selectedCell) {
            setSelectedCell(null);
            setValidMoves([]);
            return;
        }

        // If the clicked cell contains a piece, check ownership
        if (playerChar && playerChar.startsWith(currentPlayer)) {
            setSelectedCell({ row, col });
            const moves = getValidMoves(playerChar, row, col);
            setValidMoves(moves);
        } else if (playerChar) {
            alert("You can only select your own pieces.");
        }
    };

    const isValidMove = (row, col) => {
        return validMoves.some((move) => move.row === row && move.col === col);
    };

    const renderCell = (row, col) => {
        const playerChar = gameState.board[row][col];
        const isSelected =
            selectedCell &&
            selectedCell.row === row &&
            selectedCell.col === col;
        const isValid = isValidMove(row, col);
        const move = validMoves.find(
            (move) => move.row === row && move.col === col
        );

        return (
            <div
                key={`${row}-${col}`}
                onClick={() => handleCellClick(row, col)}
                style={{
                    width: "50px",
                    height: "50px",
                    border: "1px solid black",
                    backgroundColor: isSelected
                        ? "yellow"
                        : move
                        ? move.isOpponent
                            ? "red"
                            : "lightgreen"
                        : "white",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "black",
                }}
            >
                {playerChar ? playerChar : ""}
            </div>
        );
    };

    const renderBoard = () => {
        return gameState.board.map((row, rowIndex) =>
            row.map((_, colIndex) => renderCell(rowIndex, colIndex))
        );
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 50px)",
                gridGap: "5px",
            }}
        >
            {renderBoard()}
        </div>
    );
};

export default Board;
