import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../styles/colors';
import globalStyles from '../styles/globalStyles';
import Button from '../components/Button';
import { authAPI, profileAPI, setAuthToken } from '../services/api';
import { styles } from '../styles/ProfileScreenStyles';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused - loading data...');
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      console.log('Loading profile data...');
      
      const profileRes = await profileAPI.getProfile();
      
      console.log('Profile:', profileRes.data);

      setProfile(profileRes.data.user);
    } catch (error) {
      console.error('Error loading profile:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        setAuthToken(null);
        // Navigation will be handled by App.js detecting auth change
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('user');
              setAuthToken(null);
              // App.js will detect auth change and show Welcome screen
            },
          },
        ]
      );
    }
  };

  const deleteAccount = async () => {
    try {
      await authAPI.deleteAccount();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setAuthToken(null);
      // App.js will detect auth change and show Welcome screen
    } catch (error) {
      const message =
        error.response?.data?.error || 'Could not delete your account. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleDeleteAccount = () => {
    const message =
      'This permanently deletes your account, workouts, classes, and all other data. This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) deleteAccount();
    } else {
      Alert.alert('Delete Account', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={globalStyles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Header */}
      <View style={globalStyles.header}>
        <View style={{ width: 24 }} />
        <Text style={globalStyles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.name}>{profile?.full_name || 'Development User'}</Text>
          <Text style={styles.username}>@{profile?.username || 'user'}</Text>
        </View>

        {/* Account Section */}
        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="account-outline"
              title="Edit Profile"
              onPress={() => navigation.navigate('EditProfile', { profile })}
            />
            <MenuItem
              icon="lock-outline"
              title="Change Password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <MenuItem
              icon="crown-outline"
              title="Manage Subscription"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <Icon name="bell-outline" size={24} color={colors.primary} />
              <Text style={styles.menuItemText}>Workout Reminders</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <MenuItem
              icon="ruler"
              title="Units"
              onPress={() => navigation.navigate('Units')}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Log Out"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const MenuItem = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Icon name={icon} size={24} color={colors.primary} />
    <Text style={styles.menuItemText}>{title}</Text>
    <Icon name="chevron-right" size={24} color={colors.textTertiary} />
  </TouchableOpacity>
);

export default ProfileScreen;

