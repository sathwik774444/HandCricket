import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function CreateRoom() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const roomCode = Array.isArray(params.roomCode)
    ? params.roomCode[0]
    : params.roomCode;

  const goToRoom = () => {
    router.push({
      pathname: '/room',
      params: { roomCode },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room Created!</Text>
      <Text style={styles.code}>Room Code: {roomCode}</Text>
      <Text style={styles.instruction}>Share this code with your friend</Text>
      
      <TouchableOpacity style={styles.button} onPress={goToRoom}>
        <Text style={styles.buttonText}>Go to Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  code: {
    fontSize: 32,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  instruction: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
