
# [SHATRANJ](https://shatranjh.vercel.app/)
![image](https://github.com/user-attachments/assets/470ed5b9-5526-41dd-9499-51d4727fa75e)
21BRS1507 - M VARUN REDDY - HITWICKET ASSESSMENT SUBMISSION

ps: the server instance stops with inactivity, so whenever you open the app, click on create room, then refresh after a minute or two : )

A brief description of what this project does:

### [GAME OVERVIEW](https://www.youtube.com/watch?v=PdoNWiTibLY)
    - 5X5 BOARD  with 3 different Pieces
    
    - PIECE P : Pawn 
            - moves 1 tile Top/Left/Right/Bottom

    - PIECE Q : Hero1
        - moves 2 tiles Top/Left/Right/Bottom

    - PIECE R : Hero2
        - moves 2 tiles diagonally Top-Left/Top-Right/Bottom-Left/Bottom-Right

    - They all kill any opponent piece in way and cant move over same your own pieces

### GAME FLOW
    1. Game starts 
    2. Create Room, copy room code, share it with other player
    3. Join Room, copy room code shared and join the room
    4. Both Players A and B select their 5 - Pieces Configuration like PPPQP / PQRRP 
    5. Game starts with turns alternating between A and B
    6. Game stops when a player has eliminated all the pieces of opponent character.

### GAME BACKEND
    - NodeJS server with WebSockets 
        - to maintain realtime gamestate and updation with the clients
        - max 2 people in a room, as many rooms can be created
        - move validation + realtime gamestate management

### GAME FRONTEND
    - ReactJS 
        - Board rendering
        - Piece - Moves validation
        - Potential Moves 
        - Sends request to server for every move played and requests updation of gamestate
        - Landing UI


##### BLOOPERS/ BEHIND THE SCENES 
![image](https://github.com/user-attachments/assets/eea6894f-db18-49ff-813c-12b02aaa93fa)

