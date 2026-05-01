const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const rooms = {};

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // CREATE ROOM
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      players: [socket.id],
      scores: { [socket.id]: 0 },
      moves: {},
      innings: 1,
      currentBatsman: socket.id,
      currentBowler: null,
      currentTurn: null, // No one's turn until both players are ready
      gameOver: false,
      outsCount: 0, // Track outs for innings switching
      maxOuts: 3, // 3 outs per innings
      waitingFor: [], // Track which players have made their move
      completedInnings: [], // Track which players have completed their innings
      currentPhase: 'batsman', // 'batsman' or 'bowler'
      batsmanMove: null,
      bowlerMove: null,
    };

    socket.join(roomCode);

    socket.emit('room_created', roomCode);
  });

  // CHECK ROOM STATUS
  socket.on('check_room_status', (roomCode) => {
    const room = rooms[roomCode];
    
    if (!room) {
      socket.emit('room_status', false);
      return;
    }

    // Check if this socket is already in the room (is the creator)
    const isCreator = room.players.includes(socket.id);
    socket.emit('room_status', isCreator);
  });

  // JOIN ROOM
  socket.on('join_room', (roomCode) => {
    const room = rooms[roomCode];

    if (!room || room.players.length >= 2) {
      socket.emit('error_msg', 'Room full or invalid');
      return;
    }

    // Check if this is the room creator rejoining
    const isCreatorRejoining = room.players[0] === socket.id;
    
    if (isCreatorRejoining) {
      // Creator is rejoining - ensure they are the batsman
      console.log('Room creator rejoining - ensuring batsman role:', {
        socketId: socket.id,
        before: {
          currentBatsman: room.currentBatsman,
          currentBowler: room.currentBowler
        }
      });
      
      // Force creator to be batsman and adjust other player if needed
      if (room.currentBowler === socket.id) {
        // Creator was incorrectly set as bowler, fix this
        const otherPlayer = room.players.find(p => p !== socket.id);
        room.currentBatsman = socket.id;  // Creator as batsman
        room.currentBowler = otherPlayer; // Other player as bowler
        console.log('Fixed role assignment - creator now batsman:', {
          creator: room.currentBatsman,
          otherPlayer: room.currentBowler
        });
      }
      
      console.log('Room creator rejoined with roles:', {
        socketId: socket.id,
        currentBatsman: room.currentBatsman,
        currentBowler: room.currentBowler
      });
    } else {
      // New player joining - add them first
      room.players.push(socket.id);
      room.scores[socket.id] = 0;

      // Now we have 2 players, assign the second player as bowler (opposite of creator)
      if (room.currentBatsman && !room.currentBowler) {
        // Creator is batsman, so new player becomes bowler
        room.currentBowler = socket.id;
        console.log('Role assignment: Creator as batsman, new player as bowler', {
          creator: room.currentBatsman,
          bowler: room.currentBowler,
          newPlayer: socket.id
        });
      } else if (!room.currentBatsman && room.currentBowler) {
        // Creator is bowler, so new player becomes batsman
        room.currentBatsman = socket.id;
        console.log('Role assignment: Creator as bowler, new player as batsman', {
          creator: room.currentBowler,
          batsman: room.currentBatsman,
          newPlayer: socket.id
        });
      } else {
        // Fallback - ensure proper roles
        room.currentBatsman = room.players[0]; // Creator as batsman
        room.currentBowler = socket.id;        // New player as bowler
        console.log('Fallback role assignment:', {
          batsman: room.currentBatsman,
          bowler: room.currentBowler
        });
      }
    }

    console.log('Player joined room:', {
      roomCode,
      newPlayer: socket.id,
      currentBatsman: room.currentBatsman,
      currentBowler: room.currentBowler,
      totalPlayers: room.players.length,
      players: room.players
    });

    socket.join(roomCode);

    // Send game start with role information to ALL players
    const gameStartData = {
      players: room.players,
      currentBatsman: room.currentBatsman,
      currentBowler: room.currentBowler,
      currentTurn: room.currentTurn,
      currentPhase: room.currentPhase,
    };
    
    console.log('Sending game_start to all players:', gameStartData);
    io.to(roomCode).emit('game_start', gameStartData);
  });

  // GAME MOVE - Sequential turns
  socket.on('send_move', ({ roomCode, number, phase }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Check if it's the correct phase for this player
    if (phase !== room.currentPhase) {
      socket.emit('error_msg', 'It\'s not your turn yet!');
      return;
    }

    // Store the move based on phase
    if (phase === 'batsman') {
      room.batsmanMove = number;
      room.currentPhase = 'bowler'; // Move to bowler's turn
      
      // Notify all players about the phase change
      io.to(roomCode).emit('phase_change', {
        nextPhase: 'bowler',
        batsmanMove: number
      });
      
    } else if (phase === 'bowler') {
      room.bowlerMove = number;
      
      // Both players have moved, calculate result
      const [p1, p2] = room.players;
      const m1 = room.batsmanMove;
      const m2 = room.bowlerMove;

      let result = {};
      let gameOver = false;

      // Check if batsman is out (both numbers same)
      if (m1 === m2) {
        result.out = true;
        room.outsCount++;
        
        // Batsman is OUT - no runs added
      } else {
        result.out = false;
        // Batsman scores their number
        room.scores[room.currentBatsman] += m1;
      }

      // Check for innings change (3 outs)
      let inningsChanged = false;
      if (room.outsCount >= room.maxOuts) {
        // Mark current batsman's innings as completed
        if (!room.completedInnings.includes(room.currentBatsman)) {
          room.completedInnings.push(room.currentBatsman);
        }
        
        // Check if both players have completed their innings
        if (room.completedInnings.length === 2) {
          // Game over! Determine winner based on total scores
          gameOver = true;
          room.gameOver = true;
        } else {
          // Switch innings for next player
          const temp = room.currentBatsman;
          room.currentBatsman = room.currentBowler;
          room.currentBowler = temp;
          room.outsCount = 0;
          inningsChanged = true;
        }
      }

      // Determine winner if game is over
      let winner = null;
      let isDraw = false;
      if (gameOver) {
        const player1Score = room.scores[room.players[0]];
        const player2Score = room.scores[room.players[1]];
        
        if (player1Score === player2Score) {
          // It's a draw!
          isDraw = true;
          winner = null;
        } else {
          winner = player1Score > player2Score ? room.players[0] : room.players[1];
        }
        
        console.log('Game Over - Final Scores:', {
          player1: room.players[0],
          player1Score: player1Score,
          player2: room.players[1], 
          player2Score: player2Score,
          winner: winner,
          isDraw: isDraw
        });
      }

      // Send round result
      io.to(roomCode).emit('round_result', {
        players: room.players,
        batsmanMove: m1,
        bowlerMove: m2,
        scores: room.scores,
        result,
        currentBatsman: room.currentBatsman,
        currentBowler: room.currentBowler,
        outsCount: room.outsCount,
        inningsChanged,
        gameOver,
        winner,
        isDraw,
      });

      // Reset for next round
      room.batsmanMove = null;
      room.bowlerMove = null;
      room.currentPhase = 'batsman'; // Start next round with batsman
    }
  });

  // SWITCH TURNS
  socket.on('switch_turns', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Only allow current turn holder to switch
    if (socket.id !== room.currentTurn) {
      socket.emit('error_msg', 'It\'s not your turn to switch!');
      return;
    }

    // Switch batting and bowling roles
    room.currentBatsman = room.currentBowler;
    room.currentBowler = socket.id;
    room.currentTurn = room.currentBatsman;

    io.to(roomCode).emit('turns_switched', {
      currentBatsman: room.currentBatsman,
      currentBowler: room.currentBowler,
      currentTurn: room.currentTurn,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => console.log('Server running on 5000'));