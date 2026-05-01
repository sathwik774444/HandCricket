import { View, Text, Button, StyleSheet, TouchableOpacity, TouchableHighlight } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { socket } from '../socket/socket';

export default function Game() {
  const { roomCode } = useLocalSearchParams();
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [role, setRole] = useState(''); // 'batting' or 'bowling'
  const [hasMadeMove, setHasMadeMove] = useState(false);
  const [opponentHasMoved, setOpponentHasMoved] = useState(false);
  const [currentTurnPhase, setCurrentTurnPhase] = useState('batsman'); // 'batsman' or 'bowler'
  const [lastRound, setLastRound] = useState({ batsmanMove: null, bowlerMove: null, out: false });
  const [gameInfo, setGameInfo] = useState({});
  const [outsCount, setOutsCount] = useState(0);
  const [inningsChanged, setInningsChanged] = useState(false);

  // Ensure roomCode is string
  const room = Array.isArray(roomCode) ? roomCode[0] : roomCode;

  const sendMove = (num) => {
    if (!room || hasMadeMove) return;

    // Strict role and phase checking
    const isBatsmanTurn = currentTurnPhase === 'batsman' && role === 'batting';
    const isBowlerTurn = currentTurnPhase === 'bowler' && role === 'bowling';
    
    console.log('Move attempt:', {
      num,
      role,
      phase: currentTurnPhase,
      isBatsmanTurn,
      isBowlerTurn,
      canPlay: isBatsmanTurn || isBowlerTurn
    });
    
    if (!isBatsmanTurn && !isBowlerTurn) {
      console.log('NOT YOUR TURN! Role:', role, 'Phase:', currentTurnPhase);
      return; // Block the move if it's not their turn
    }

    console.log('Player clicked:', num, 'Role:', role, 'Phase:', currentTurnPhase);
    socket.emit('send_move', { roomCode: room, number: num, phase: currentTurnPhase });
    setHasMadeMove(true);
    console.log('Move sent, waiting for result');
  };

  useEffect(() => {
    // Log when component mounts and socket is ready
    console.log('🚀 Game component mounted, socket ID:', socket.id);
    
    // Add a general listener to see all events
    const handleAnyEvent = (eventName, ...args) => {
      console.log('📡 Socket event received:', eventName, args);
    };
    
    const handleGameStart = (data) => {
      const myId = socket.id;
      console.log('Game start received:', {
        myId,
        data,
        currentBatsman: data.currentBatsman,
        currentBowler: data.currentBowler
      });
      
      const isBatsman = data.currentBatsman === myId;
      const isBowler = data.currentBowler === myId;
      
      console.log('Role determination:', {
        myId,
        isBatsman,
        isBowler,
        assignedRole: isBatsman ? 'batting' : isBowler ? 'bowling' : 'spectator'
      });
      
      const assignedRole = isBatsman ? 'batting' : isBowler ? 'bowling' : 'spectator';
      setRole(assignedRole);
      
      // Additional debugging for role assignment
      console.log('Final role set:', assignedRole, 'for player:', myId);
      
      // Force role update after a delay to ensure it's set
      setTimeout(() => {
        console.log('Role verification - Current role:', role, 'Expected:', assignedRole);
        if (role !== assignedRole) {
          console.log('Role mismatch detected, forcing role update');
          setRole(assignedRole);
        }
      }, 1000);
      
      // Also log when game_start is received
      console.log('🎮 Game start event processed successfully for:', myId);
      setGameInfo(data);
      setHasMadeMove(false);
      setOpponentHasMoved(false);
      setCurrentTurnPhase('batsman'); // Always start with batsman's turn
    };

    // Fallback: If no game_start received within 3 seconds, try to determine role manually
    const fallbackTimer = setTimeout(() => {
      if (role === '') {
        console.log('⚠️ No game_start received, attempting manual role assignment for:', socket.id);
        // Try to get room info from backend or use a default
        setRole('bowling'); // Default to bowling for safety
        setCurrentTurnPhase('batsman');
        console.log('🔧 Assigned default role: bowling');
      }
    }, 3000);

    const handleRound = (data) => {
      const myId = socket.id;
      
      // Add safety checks
      if (!data) {
        console.error('Round data is undefined');
        return;
      }
      
      // Debug logging
      console.log('Round Result:', {
        myId,
        myScore: data.scores?.[myId] || 0,
        allScores: data.scores,
        gameOver: data.gameOver,
        currentBatsman: data.currentBatsman,
        result: data.result
      });
      
      if (data?.scores && myId) {
        setScore(data.scores[myId] || 0);
      }
      
      // Update roles
      const isBatsman = data.currentBatsman === myId;
      setRole(isBatsman ? 'batting' : 'bowling');
      setGameInfo(data);
      
      // Update round info
      setLastRound({
        batsmanMove: data.batsmanMove,
        bowlerMove: data.bowlerMove,
        out: data.result?.out || false,
      });
      
      setOutsCount(data.outsCount || 0);
      setInningsChanged(data.inningsChanged || false);
      
      // Check for game over
      if (data.gameOver) {
        const isWinner = data.winner === myId;
        
        // Safely get opponent score
        let opponentScore = 0;
        if (data.players && Array.isArray(data.players) && data.players.length >= 2) {
          const opponentId = myId === data.players[0] ? data.players[1] : data.players[0];
          opponentScore = data.scores[opponentId] || 0;
        }
        
        console.log('Game Over - Navigating to result:', {
          myScore: data.scores[myId] || 0,
          opponentScore,
          isWinner
        });
        
        router.push({
          pathname: '/result',
          params: { 
            score: data.scores[myId] || 0,
            won: isWinner,
            opponentScore: opponentScore,
          },
        });
        return;
      }
      
      // Reset for next round
      setHasMadeMove(false);
      setOpponentHasMoved(false);
      setCurrentTurnPhase('batsman'); // Start next round with batsman again
    };

    const handlePlayerMoved = (data) => {
      // If someone else moved, update UI
      if (data.playerId !== socket.id) {
        setOpponentHasMoved(true);
      }
    };

    const handlePhaseChange = (data) => {
      console.log('Phase change:', data);
      setCurrentTurnPhase(data.nextPhase);
      setHasMadeMove(false); // Reset for new phase
      setOpponentHasMoved(false);
    };

    socket.on('game_start', handleGameStart);
    socket.on('round_result', handleRound);
    socket.on('player_moved', handlePlayerMoved);
    socket.on('phase_change', handlePhaseChange);

    return () => {
      clearTimeout(fallbackTimer);
      socket.off('game_start', handleGameStart);
      socket.off('round_result', handleRound);
      socket.off('player_moved', handlePlayerMoved);
      socket.off('phase_change', handlePhaseChange);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏏 Hand Cricket</Text>
      
      {/* Role and Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.role}>You are: <Text style={role === 'batting' ? styles.batting : styles.bowling}>{role.toUpperCase()}</Text></Text>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.outs}>Outs: {outsCount}/3</Text>
        {inningsChanged && (
          <Text style={styles.inningsChange}>
            {role === 'batting' ? '🏏 Second Innings - You are batting!' : '🎯 Second Innings - You are bowling!'}
          </Text>
        )}
        {/* <Text style={styles.debug}>Role: {role}, Phase: {currentTurnPhase}, Socket: {socket.id?.slice(-6)}</Text> */}
        
        {/* Clear turn indicator */}
        {/* <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {currentTurnPhase === 'batsman' ? 
              (role === 'batting' ? '🏏 YOUR TURN TO BAT!' : '⏳ Waiting for batsman...') :
              (role === 'bowling' ? '🎯 YOUR TURN TO BOWL!' : '⏳ Waiting for bowler...')
            }
          </Text>
        </View> */}
      </View>

      {/* Last Round Result */}
      {lastRound.batsmanMove !== null && (
        <View style={styles.roundResult}>
          {/* <Text style={styles.roundTitle}>Last Round:</Text> */}
          {/* <Text style={styles.moves}>Batsman: {lastRound.batsmanMove} vs Bowler: {lastRound.bowlerMove}</Text> */}
          {lastRound.out ? (
            <Text style={styles.outText}>🔴 OUT!</Text>
          ) : (
            <View style={styles.runsContainer}>
              <Text style={styles.runsText}>+{lastRound.batsmanMove}</Text>
              <Text style={styles.runsLabel}>RUNS</Text>
            </View>
          )}
        </View>
      )}

      {/* Game Controls */}
      {(() => {
        const isBatsmanTurn = currentTurnPhase === 'batsman' && role === 'batting';
        const isBowlerTurn = currentTurnPhase === 'bowler' && role === 'bowling';
        const canPlay = isBatsmanTurn || isBowlerTurn;
        
        if (canPlay && !hasMadeMove) {
          return (
            <View style={styles.gameArea}>
              <Text style={styles.instruction}>Choose your number (1-6):</Text>
              <View style={styles.grid}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <TouchableOpacity 
                    key={n} 
                    style={styles.button}
                    onPress={() => sendMove(n)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        } else if (hasMadeMove) {
          return (
            <View style={styles.gameArea}>
              <Text style={styles.instruction}>
                {currentTurnPhase === 'batsman' ? '⏳ Waiting for bowler to choose...' : '⏳ Waiting for batter to choose...'}
              </Text>
              <Text style={styles.debug}>Phase: {currentTurnPhase}, Role: {role}</Text>
            </View>
          );
        } else {
          // It's opponent's turn
          const waitingMessage = currentTurnPhase === 'batsman' 
            ? '⏳ Waiting for batter to choose...' 
            : '⏳ Waiting for bowler to choose...';
          
          return (
            <View style={styles.gameArea}>
              <Text style={styles.instruction}>{waitingMessage}</Text>
              {/* <Text style={styles.debug}>Phase: {currentTurnPhase}, Role: {role}</Text> */}
            </View>
          );
        }
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 36,
    marginBottom: 25,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  statusContainer: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  role: {
    fontSize: 20,
    marginBottom: 8,
    color: '#e94560',
    fontWeight: '600',
  },
  batting: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 22,
    textShadowColor: 'rgba(0, 255, 136, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bowling: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 22,
    textShadowColor: 'rgba(255, 107, 107, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  score: {
    fontSize: 22,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  outs: {
    fontSize: 18,
    marginBottom: 12,
    color: '#a8a8a8',
    fontWeight: '500',
  },
  inningsChange: {
    fontSize: 16,
    color: '#f39c12',
    fontWeight: 'bold',
  },
  roundResult: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  moves: {
    fontSize: 16,
    marginBottom: 5,
  },
  outText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  safeText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  runsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
  },
  runsText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
  },
  runsLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginLeft: 5,
  },
  gameArea: {
    alignItems: 'center',
    width: '100%',
  },
  instruction: {
    fontSize: 18,
    marginBottom: 25,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  button: {
    margin: 5,
    width: '30%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#1e3a8a',
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(59, 130, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  debug: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  turnIndicator: {
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  turnText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
