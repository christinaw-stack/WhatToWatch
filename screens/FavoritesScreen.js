import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!loading && favorites.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, favorites]);

  const loadFavorites = async () => {
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const favs = [];
      querySnapshot.forEach((doc) => {
        // Initialize watchStatus to 'unwatched' if not set (local only)
        favs.push({
          id: doc.id,
          ...doc.data(),
          watchStatus: doc.data().watchStatus || 'unwatched'
        });
      });
      setFavorites(favs);
    } catch (error) {
      Alert.alert('Error', 'Failed to load favorites: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFavorite = async (favoriteId) => {
    try {
      await deleteDoc(doc(db, 'favorites', favoriteId));
      setFavorites(favorites.filter((fav) => fav.id !== favoriteId));
      Alert.alert('Success', 'Removed from favorites');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete favorite: ' + error.message);
    }
  };

  const updateWatchStatus = async (favoriteId, newStatus) => {
    try {
      await updateDoc(doc(db, 'favorites', favoriteId), {
        watchStatus: newStatus,
        watchStatusUpdatedAt: new Date().toISOString()
      });
      setFavorites(favorites.map(fav =>
        fav.id === favoriteId ? { ...fav, watchStatus: newStatus } : fav
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to update status: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Favorites</Text>
      </View>

      <ScrollView style={styles.content}>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favorites yet!</Text>
            <Text style={styles.emptySubtext}>
              Save recommendations from the home screen to see them here.
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {favorites.map((favorite) => (
              <View key={favorite.id} style={styles.favoriteCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.favTitle}>{favorite.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    favorite.watchStatus === 'watched' && styles.statusBadgeWatched,
                    favorite.watchStatus === 'watching' && styles.statusBadgeWatching,
                    (!favorite.watchStatus || favorite.watchStatus === 'unwatched') && styles.statusBadgeUnwatched
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      (!favorite.watchStatus || favorite.watchStatus === 'unwatched') && styles.statusBadgeTextUnwatched
                    ]}>
                      {favorite.watchStatus === 'watched' ? '✓ Watched' :
                       favorite.watchStatus === 'watching' ? '▶ Watching' :
                       '○ To Watch'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.favDescription}>{favorite.description}</Text>
                <Text style={styles.favReason}>
                  <Text style={styles.boldText}>Why you'll love it: </Text>
                  {favorite.reason}
                </Text>

                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      (!favorite.watchStatus || favorite.watchStatus === 'unwatched') && styles.statusButtonActive
                    ]}
                    onPress={() => updateWatchStatus(favorite.id, 'unwatched')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      (!favorite.watchStatus || favorite.watchStatus === 'unwatched') && styles.statusButtonTextActive
                    ]}>To Watch</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      favorite.watchStatus === 'watching' && styles.statusButtonActive
                    ]}
                    onPress={() => updateWatchStatus(favorite.id, 'watching')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      favorite.watchStatus === 'watching' && styles.statusButtonTextActive
                    ]}>Watching</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      favorite.watchStatus === 'watched' && styles.statusButtonActive
                    ]}
                    onPress={() => updateWatchStatus(favorite.id, 'watched')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      favorite.watchStatus === 'watched' && styles.statusButtonTextActive
                    ]}>Watched</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteFavorite(favorite.id)}
                >
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF69B4',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  favoriteCard: {
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
  favTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  favDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    lineHeight: 22,
  },
  favReason: {
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
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeUnwatched: {
    backgroundColor: '#E5E5EA',
  },
  statusBadgeWatching: {
    backgroundColor: '#007AFF',
  },
  statusBadgeWatched: {
    backgroundColor: '#34C759',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  statusBadgeTextUnwatched: {
    color: '#666',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 15,
    marginBottom: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: 'white',
  },
});
