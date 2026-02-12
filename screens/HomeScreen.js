import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { GEMINI_API_KEY } from '../config';

export default function HomeScreen({ navigation }) {
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getRecommendations = async () => {
    if (!mood.trim()) {
      Alert.alert('Error', 'Please tell us what you\'re in the mood for!');
      return;
    }

    setLoading(true);
    setRecommendations([]);

    try {
      const prompt = `You are a helpful movie and TV show recommendation assistant. The user says: "${mood}".

      Please provide 3-5 personalized viewing recommendations based on their input. For each recommendation, include:
      1. The title
      2. A brief description (1-2 sentences)
      3. Why they would enjoy it based on what they said (1-2 sentences)

      Format your response as a JSON array with this structure:
      [
        {
          "title": "Show/Movie Title",
          "description": "Brief description",
          "reason": "Why they'll enjoy it"
        }
      ]

      Only return the JSON array, nothing else.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        // Extract JSON from the response (remove markdown code blocks if present)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedRecommendations = JSON.parse(jsonMatch[0]);
          setRecommendations(parsedRecommendations);
        } else {
          Alert.alert('Error', 'Could not parse recommendations. Please try again.');
        }
      } else {
        Alert.alert('Error', 'No recommendations received. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get recommendations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveFavorite = async (recommendation) => {
    try {
      await addDoc(collection(db, 'favorites'), {
        userId: auth.currentUser.uid,
        title: recommendation.title,
        description: recommendation.description,
        reason: recommendation.reason,
        savedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Added to favorites!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save favorite: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What Should I Watch?</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.favoritesButton}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Text style={styles.favoritesButtonText}>My Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>What are you in the mood for?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., A feel-good comedy, something scary, a documentary about nature..."
          value={mood}
          onChangeText={setMood}
          multiline={true}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={getRecommendations}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Get Recommendations</Text>
          )}
        </TouchableOpacity>

        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Recommendations for you:</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recDescription}>{rec.description}</Text>
                <Text style={styles.recReason}>
                  <Text style={styles.boldText}>Why you'll love it: </Text>
                  {rec.reason}
                </Text>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => saveFavorite(rec)}
                >
                  <Text style={styles.saveButtonText}>Save to Favorites</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF69B4',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  favoritesButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  favoritesButtonText: {
    color: '#FF69B4',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recommendationsContainer: {
    marginBottom: 30,
  },
  recommendationsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  recommendationCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    lineHeight: 22,
  },
  recReason: {
    fontSize: 15,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 15,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
    fontStyle: 'normal',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
