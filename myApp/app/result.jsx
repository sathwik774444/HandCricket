import { View, Text, Button, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Result() {
  const router = useRouter();
  const { score, won, opponentScore, draw } = useLocalSearchParams();

  const finalScore = parseInt(score) || 0;
  const finalOpponentScore = parseInt(opponentScore) || 0;
  const isWinner = won === 'true';
  const isDraw = draw === 'true';

  return (
    <View style={[styles.container, isWinner && styles.winnerContainer, isDraw && styles.drawContainer]}>
      <Text style={styles.title}>🏏 Game Over!</Text>
      
      <View style={[styles.resultContainer, isWinner && styles.winnerResultContainer, isDraw && styles.drawResultContainer]}>
        <Text style={isDraw ? styles.draw : (isWinner ? styles.won : styles.lost)}>
          {isDraw ? '🤝 It\'s a Draw!' : (isWinner ? '🏆 You Won!' : '😔 You Lost!')}
        </Text>
        
        <View style={styles.scores}>
          <Text style={styles.scoreText}>Your Score: {finalScore}</Text>
          <Text style={styles.scoreText}>Opponent: {finalOpponentScore}</Text>
        </View>
        
        <Text style={styles.difficulty}>
          {isDraw ? 'Well matched!' : (isWinner ? 'Congratulations!' : 'Better luck next time!')}
        </Text>
        
        {!isWinner && !isDraw && (
          <View style={styles.inspirationContainer}>
            <Text style={styles.inspirationText}>💪 Don't give up!</Text>
            <Text style={styles.inspirationSubtext}>Every champion was once a beginner</Text>
            <Text style={styles.inspirationSubtext}>You'll win the next one! 🏏</Text>
          </View>
        )}
        
        {isWinner && (
          <View style={styles.celebrationBadges}>
            <Text style={styles.badge}>🏆</Text>
            <Text style={styles.badge}>⭐</Text>
            <Text style={styles.badge}>🎉</Text>
          </View>
        )}
        
        {isDraw && (
          <View style={styles.drawBadges}>
            <Text style={styles.badge}>🤝</Text>
            <Text style={styles.badge}>⚖️</Text>
            <Text style={styles.badge}>🎯</Text>
          </View>
        )}
      </View>

      <Button title="Play Again" onPress={() => router.push('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    padding: 20,
  },
  winnerContainer: {
    backgroundColor: '#fff8e1',
    borderWidth: 8,
    borderColor: '#ffd700',
    borderRadius: 20,
  },
  drawContainer: {
    backgroundColor: '#e8f5e8',
    borderWidth: 8,
    borderColor: '#4CAF50',
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 30,
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  winnerResultContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 4,
    borderColor: '#ffc107',
    shadowColor: '#ffc107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawResultContainer: {
    backgroundColor: '#e8f5e8',
    borderWidth: 4,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  won: {
    fontSize: 28,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  lost: {
    fontSize: 28,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  draw: {
    fontSize: 28,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scores: {
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 20,
    marginBottom: 5,
    textAlign: 'center',
  },
  difficulty: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  celebrationBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  drawBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  badge: {
    fontSize: 24,
    marginHorizontal: 10,
  },
  inspirationContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  inspirationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 8,
  },
  inspirationSubtext: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 3,
  },
});
