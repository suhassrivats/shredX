import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authAPI, setAuthToken } from '../services/api';

export default function useAppleSignIn() {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Apple only returns the name on the first sign-in, so pass it through now.
      const { givenName, familyName } = credential.fullName || {};
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      const res = await authAPI.apple({
        identity_token: credential.identityToken,
        full_name: fullName || undefined,
      });
      if (res.data.access_token) {
        await AsyncStorage.setItem('authToken', res.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        setAuthToken(res.data.access_token);
      }
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') return;
      const message =
        error.response?.data?.error || 'Apple sign-in failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading, available };
}
