import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { socket } from '../socket/socket';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  // CREATE ROOM
  const createRoom = () => {
    socket.emit('create_room');

    socket.off('room_created');

    socket.on('room_created', (roomCode) => {
      router.push({
        pathname: '/game',
        params: { roomCode },
      });
    });
  };

  // JOIN ROOM
  const joinRoom = () => {
    if (!joinCode) return;

    router.push({
      pathname: '/room',
      params: { roomCode: joinCode.toUpperCase() },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏏 Hand Cricket</Text>

      {/* Create Room */}
      <TouchableOpacity style={styles.button} onPress={createRoom}>
        <Text style={styles.buttonText}>Create Room</Text>
      </TouchableOpacity>

      {/* Join Room */}
      <TextInput
        placeholder="Enter Room Code"
        value={joinCode}
        onChangeText={setJoinCode}
        style={styles.input}
      />

      <TouchableOpacity style={styles.joinButton} onPress={joinRoom}>
        <Text style={styles.buttonText}>Join Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 40,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  input: {
    width: 200,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
});
