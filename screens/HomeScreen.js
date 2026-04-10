import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { SPOTIFY_AI_API_KEY } from '../config';

export default function HomeScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(''); // 'movie' or 'tvshow'
  const [tvType, setTvType] = useState(''); // 'reality' or 'scripted'
  const [streamers, setStreamers] = useState([]); // selected streaming services
  const [actor, setActor] = useState(''); // specific actor/actress
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [savedIndex, setSavedIndex] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const celebrationScale = useRef(new Animated.Value(1)).current;

  const loadingMessages = [
    'Finding your next binge...',
    'Searching the streaming archives...',
    'Asking the entertainment gods...',
    'Consulting our AI critic...',
    'Picking the perfect watch...',
    'Analyzing your taste...',
    'Scanning thousands of titles...',
    'Getting cozy recommendations...',
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleStreamer = (streamer) => {
    if (streamers.includes(streamer)) {
      setStreamers(streamers.filter(s => s !== streamer));
    } else {
      setStreamers([...streamers, streamer]);
    }
  };

  const availableStreamers = [
    'Netflix', 'Hulu', 'Disney+', 'Prime Video',
    'HBO Max', 'Apple TV+', 'Peacock', 'Paramount+'
  ];

  // Fade in animation when recommendations load
  useEffect(() => {
    if (recommendations.length > 0) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [recommendations]);

  // Rotate loading messages while loading
  useEffect(() => {
    if (loading) {
      let messageIndex = 0;
      setLoadingMessage(loadingMessages[0]);

      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const getRecommendations = async () => {
    console.log('getRecommendations called');

    if (!selectedType) {
      Alert.alert('Error', 'Please select either Movie or TV Show!');
      return;
    }

    if (selectedType === 'tvshow' && !tvType) {
      Alert.alert('Error', 'Please select Reality or Scripted for TV shows!');
      return;
    }

    // Check genre requirements
    if (selectedType === 'movie' && !genre.trim()) {
      Alert.alert('Error', 'Please enter a genre for movies!');
      return;
    }

    if (selectedType === 'tvshow' && tvType === 'scripted' && !genre.trim()) {
      Alert.alert('Error', 'Please enter a genre for scripted TV shows!');
      return;
    }

    console.log('Starting API call...');
    setLoading(true);
    setRecommendations([]);

    try {
      let prompt;
      if (selectedType === 'movie') {
        const streamerText = streamers.length > 0
          ? `The user has access to: ${streamers.join(', ')}. Only recommend movies available on these platforms.`
          : '';
        const actorText = actor.trim()
          ? `The user wants movies featuring ${actor.trim()}.`
          : '';

        prompt = `You are a helpful movie recommendation assistant. The user wants ${genre} movie recommendations. ${actorText} ${streamerText}

      Please provide 3-5 personalized ${genre} movie recommendations. For each recommendation, include:
      1. The title
      2. A brief description (1-2 sentences)
      3. Why they would enjoy it (1-2 sentences)

      Format your response as a JSON array with this structure:
      [
        {
          "title": "Movie Title",
          "description": "Brief description",
          "reason": "Why they'll enjoy it"
        }
      ]

      Only return the JSON array, nothing else.`;
      } else {
        const streamerText = streamers.length > 0
          ? `The user has access to: ${streamers.join(', ')}. Only recommend shows available on these platforms.`
          : '';

        if (tvType === 'reality') {
          prompt = `You are a helpful TV show recommendation assistant. The user wants reality TV show recommendations. ${streamerText}

        Please provide 3-5 personalized reality TV show recommendations. For each recommendation, include:
        1. The title
        2. A brief description (1-2 sentences)
        3. Why they would enjoy it (1-2 sentences)

        Format your response as a JSON array with this structure:
        [
          {
            "title": "TV Show Title",
            "description": "Brief description",
            "reason": "Why they'll enjoy it"
          }
        ]

        Only return the JSON array, nothing else.`;
        } else {
          const actorText = actor.trim()
            ? `The user wants TV shows featuring ${actor.trim()}.`
            : '';

          prompt = `You are a helpful TV show recommendation assistant. The user wants ${genre} scripted TV show recommendations. ${actorText} ${streamerText}

        Please provide 3-5 personalized ${genre} scripted TV show recommendations. For each recommendation, include:
        1. The title
        2. A brief description (1-2 sentences)
        3. Why they would enjoy it (1-2 sentences)

        Format your response as a JSON array with this structure:
        [
          {
            "title": "TV Show Title",
            "description": "Brief description",
            "reason": "Why they'll enjoy it"
          }
        ]

        Only return the JSON array, nothing else.`;
        }
      }

      const response = await fetch(
        'https://hendrix-genai.spotify.net/taskforce/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'apikey': SPOTIFY_AI_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        }
      );

      const data = await response.json();

      // Log the response for debugging
      console.log('API Response:', JSON.stringify(data, null, 2));

      if (data.error) {
        Alert.alert('API Error', data.error.message || 'Unknown error from API');
        return;
      }

      if (data.choices && data.choices[0]?.message?.content) {
        const text = data.choices[0].message.content;
        // Extract JSON from the response (remove markdown code blocks if present)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedRecommendations = JSON.parse(jsonMatch[0]);
          setRecommendations(parsedRecommendations);
        } else {
          Alert.alert('Error', 'Could not parse recommendations. Please try again.');
        }
      } else {
        Alert.alert('Error', 'No recommendations received. Response: ' + JSON.stringify(data).substring(0, 200));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get recommendations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Button press animation
  const handleButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    getRecommendations();
  };

  const saveFavorite = async (recommendation, index) => {
    try {
      await addDoc(collection(db, 'favorites'), {
        userId: auth.currentUser.uid,
        title: recommendation.title,
        description: recommendation.description,
        reason: recommendation.reason,
        savedAt: new Date().toISOString(),
        watchStatus: 'unwatched',
        type: selectedType,
        genre: genre || '',
      });

      // Celebration animation!
      setSavedIndex(index);
      Animated.sequence([
        Animated.spring(celebrationScale, {
          toValue: 1.2,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      // Reset after 2 seconds
      setTimeout(() => setSavedIndex(null), 2000);

    } catch (error) {
      console.error('Save error:', error);
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

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedType === 'movie' && styles.optionButtonSelected
            ]}
            onPress={() => {
              setSelectedType('movie');
              setTvType(''); // Clear TV type when switching to movie
              setStreamers([]); // Clear streamers
              setActor(''); // Clear actor
              setGenre(''); // Clear genre
            }}
          >
            <Text style={[
              styles.optionButtonText,
              selectedType === 'movie' && styles.optionButtonTextSelected
            ]}>
              Movie
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedType === 'tvshow' && styles.optionButtonSelected
            ]}
            onPress={() => {
              setSelectedType('tvshow');
              setStreamers([]); // Clear streamers
              setActor(''); // Clear actor
              setGenre(''); // Clear genre
            }}
          >
            <Text style={[
              styles.optionButtonText,
              selectedType === 'tvshow' && styles.optionButtonTextSelected
            ]}>
              TV Show
            </Text>
          </TouchableOpacity>
        </View>

        {selectedType === 'movie' && (
          <>
            <Text style={styles.label}>What streamers do you have?</Text>
            <View style={styles.streamersContainer}>
              {availableStreamers.map((streamer) => (
                <TouchableOpacity
                  key={streamer}
                  style={[
                    styles.streamerChip,
                    streamers.includes(streamer) && styles.streamerChipSelected
                  ]}
                  onPress={() => toggleStreamer(streamer)}
                >
                  <Text style={[
                    styles.streamerChipText,
                    streamers.includes(streamer) && styles.streamerChipTextSelected
                  ]}>
                    {streamer}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Do you have a specific actor or actress in mind?</Text>
            <TextInput
              style={styles.actorInput}
              placeholder="e.g., Tom Hanks, Meryl Streep (optional)"
              value={actor}
              onChangeText={setActor}
            />

            <Text style={styles.label}>What genre?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., comedy, horror, drama, sci-fi, romance..."
              value={genre}
              onChangeText={setGenre}
            />
          </>
        )}

        {selectedType === 'tvshow' && (
          <>
            <Text style={styles.label}>What streamers do you have?</Text>
            <View style={styles.streamersContainer}>
              {availableStreamers.map((streamer) => (
                <TouchableOpacity
                  key={streamer}
                  style={[
                    styles.streamerChip,
                    streamers.includes(streamer) && styles.streamerChipSelected
                  ]}
                  onPress={() => toggleStreamer(streamer)}
                >
                  <Text style={[
                    styles.streamerChipText,
                    streamers.includes(streamer) && styles.streamerChipTextSelected
                  ]}>
                    {streamer}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Do you want reality TV show or scripted TV show recommendations?</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  tvType === 'reality' && styles.optionButtonSelected
                ]}
                onPress={() => {
                  setTvType('reality');
                  setActor(''); // Clear actor when switching to reality
                  setGenre(''); // Clear genre when switching to reality
                }}
              >
                <Text style={[
                  styles.optionButtonText,
                  tvType === 'reality' && styles.optionButtonTextSelected
                ]}>
                  Reality TV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  tvType === 'scripted' && styles.optionButtonSelected
                ]}
                onPress={() => {
                  setTvType('scripted');
                  setActor(''); // Clear actor when switching to scripted
                  setGenre(''); // Clear genre when switching to scripted
                }}
              >
                <Text style={[
                  styles.optionButtonText,
                  tvType === 'scripted' && styles.optionButtonTextSelected
                ]}>
                  Scripted TV
                </Text>
              </TouchableOpacity>
            </View>

            {tvType === 'scripted' && (
              <>
                <Text style={styles.label}>Do you have a specific actor or actress in mind?</Text>
                <TextInput
                  style={styles.actorInput}
                  placeholder="e.g., Steve Carell, Jennifer Aniston (optional)"
                  value={actor}
                  onChangeText={setActor}
                />

                <Text style={styles.label}>What genre?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., comedy, drama, sci-fi, thriller..."
                  value={genre}
                  onChangeText={setGenre}
                />
              </>
            )}
          </>
        )}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleButtonPress}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Get Recommendations</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {recommendations.length > 0 && (
          <Animated.View
            style={[
              styles.recommendationsContainer,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <Text style={styles.recommendationsTitle}>Recommendations for you:</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recDescription}>{rec.description}</Text>
                <Text style={styles.recReason}>
                  <Text style={styles.boldText}>Why you'll love it: </Text>
                  {rec.reason}
                </Text>
                <Animated.View style={savedIndex === index ? { transform: [{ scale: celebrationScale }] } : {}}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      savedIndex === index && styles.saveButtonSaved
                    ]}
                    onPress={() => saveFavorite(rec, index)}
                    disabled={savedIndex === index}
                  >
                    <Text style={styles.saveButtonText}>
                      {savedIndex === index ? '✓ Saved!' : 'Save to Favorites'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ))}
          </Animated.View>
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
    marginBottom: 15,
    color: '#333',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  optionButtonSelected: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  optionButtonTextSelected: {
    color: 'white',
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
  actorInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
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
  loadingContainer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
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
  saveButtonSaved: {
    backgroundColor: '#FF69B4',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  streamersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  streamerChip: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  streamerChipSelected: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  streamerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  streamerChipTextSelected: {
    color: 'white',
  },
});
