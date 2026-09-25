import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../components/Button';
import colors from '../styles/colors';
import useGoogleSignIn from '../hooks/useGoogleSignIn';
import useAppleSignIn from '../hooks/useAppleSignIn';

const WelcomeScreen = ({ navigation }) => {
  const { signIn: handleGoogleSignIn, loading: googleLoading } = useGoogleSignIn();
  const {
    signIn: handleAppleSignIn,
    loading: appleLoading,
    available: appleAvailable,
  } = useAppleSignIn();
  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Icon name="dumbbell" size={48} color={colors.primary} />
            <Text style={styles.logoText}>ShredX</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>Build a Stronger You</Text>
            <Text style={styles.subtitle}>
              Track workouts, create plans, and hit your goals.
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name="chart-line" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Track Progress</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name="playlist-edit" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Custom Plans</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name="fire" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Stay Motivated</Text>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Get Started"
              onPress={() => navigation.navigate('Register')}
              style={styles.primaryButton}
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginBold}>Log In</Text>
              </Text>
            </TouchableOpacity>

            {/* Social Login */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              {appleAvailable && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={appleLoading}
                  accessibilityLabel="Sign in with Apple"
                >
                  <Icon name="apple" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <Icon name="google" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: 'rgba(16, 34, 22, 0.9)',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  mainContent: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 32,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(19, 236, 91, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
  },
  loginButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  loginBold: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WelcomeScreen;

