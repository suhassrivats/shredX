import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../components/Button';
import Input from '../components/Input';
import colors from '../styles/colors';
import { authAPI, setAuthToken } from '../services/api';
import * as AppleAuthentication from 'expo-apple-authentication';
import useGoogleSignIn from '../hooks/useGoogleSignIn';
import useAppleSignIn from '../hooks/useAppleSignIn';

const RegisterScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [errors, setErrors] = useState({});

  const { signIn: handleGoogleSignIn, loading: googleLoading } = useGoogleSignIn();
  const { signIn: handleAppleSignIn, available: appleAvailable } = useAppleSignIn();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!isLogin && !formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const endpoint = isLogin ? authAPI.login : authAPI.register;
      const data = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            username: formData.username,
            password: formData.password,
            role: formData.role,
          };

      const response = await endpoint(data);

      if (response.data.access_token) {
        console.log('Login successful, saving token...');
        await AsyncStorage.setItem('authToken', response.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setAuthToken(response.data.access_token);
        console.log('Token saved, auth state should update shortly');
      }
    } catch (error) {
      const message =
        error.response?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
      }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Icon name="dumbbell" size={40} color={colors.primary} />
            <Text style={styles.logoText}>ShredX</Text>
          </View>
          <Text style={styles.tagline}>Track Your Progress, Crush Your Goals.</Text>

          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {!isLogin && (
              <Input
                label="Username"
                placeholder="Choose a username"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
                autoCapitalize="none"
                error={errors.username}
              />
            )}

            <Input
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              error={errors.password}
            />

            {!isLogin && (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
                secureTextEntry
                error={errors.confirmPassword}
              />
            )}

            {!isLogin && (
              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I am a:</Text>
                <View style={styles.roleToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleToggleButton,
                      formData.role === 'student' && styles.roleToggleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, role: 'student' })
                    }
                  >
                    <Text
                      style={[
                        styles.roleToggleText,
                        formData.role === 'student' && styles.roleToggleTextActive,
                      ]}
                    >
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleToggleButton,
                      formData.role === 'instructor' &&
                        styles.roleToggleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, role: 'instructor' })
                    }
                  >
                    <Text
                      style={[
                        styles.roleToggleText,
                        formData.role === 'instructor' &&
                          styles.roleToggleTextActive,
                      ]}
                    >
                      Instructor
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Button
              title={isLogin ? 'Login' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Social Login */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <Icon name="google" size={20} color={colors.textPrimary} />
                <Text style={styles.socialButtonText}>
                  {googleLoading ? 'Signing in…' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <Text style={styles.termsText}>
                By creating an account, you agree to our{'\n'}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 34, 22, 0.85)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  formContainer: {
    gap: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: colors.textTertiary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  appleButton: {
    height: 48,
  },
  socialButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  roleContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  roleToggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleToggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  roleToggleTextActive: {
    color: colors.textPrimary,
  },
});

export default RegisterScreen;


