import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { socket } from '../socket/socket';

export default function Room() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const roomCode = Array.isArray(params.roomCode)
    ? params.roomCode[0]
    : params.roomCode;

  useEffect(() => {
    if (!roomCode) return;

    // Only join room if we're not already the creator
    // Check if this socket is not already in the room
    socket.emit('check_room_status', roomCode);

    const handleGameStart = (data) => {
      router.push({
        pathname: '/game',
        params: { roomCode },
      });
    };

    const handleRoomCheck = (isCreator) => {
      if (isCreator) {
        // If already the creator, go directly to game
        router.push({
          pathname: '/game',
          params: { roomCode },
        });
      } else {
        socket.emit('join_room', roomCode);
      }
    };

    socket.on('game_start', handleGameStart);
    socket.on('room_status', handleRoomCheck);

    return () => {
      socket.off('game_start', handleGameStart);
      socket.off('room_status', handleRoomCheck);
    };
  }, [roomCode , router]);

  return (
    <View style={styles.container}>
      <Text style={styles.code}>Room Code: {roomCode}</Text>
      <Text style={styles.wait}>Waiting for player...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  code: {
    fontSize: 20,
    marginBottom: 10,
  },
  wait: {
    fontSize: 16,
    color: 'gray',
  },
});
