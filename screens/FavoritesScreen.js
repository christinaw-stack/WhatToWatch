import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const favs = [];
      querySnapshot.forEach((doc) => {
        favs.push({ id: doc.id, ...doc.data() });
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
          favorites.map((favorite) => (
            <View key={favorite.id} style={styles.favoriteCard}>
              <Text style={styles.favTitle}>{favorite.title}</Text>
              <Text style={styles.favDescription}>{favorite.description}</Text>
              <Text style={styles.favReason}>
                <Text style={styles.boldText}>Why you'll love it: </Text>
                {favorite.reason}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteFavorite(favorite.id)}
              >
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
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
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
