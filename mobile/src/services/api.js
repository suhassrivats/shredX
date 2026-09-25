import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve the dev backend host from whatever Metro is serving on, so the
// same code works on simulator (127.0.0.1), Android emulator (10.0.2.2),
// and a physical device on LAN (192.168.x.y).
function devApiBaseUrl() {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;
  const host = debuggerHost?.split(':')?.[0];
  if (host) return `http://${host}:5000/api`;
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';
}

const API_BASE_URL = __DEV__
  ? devApiBaseUrl()
  : 'https://fittrack-api.fly.dev/api';

// Export for use in screens
export const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Auth token error:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.response?.data);
    // Clear invalid tokens on 401 unauthorized or 422 signature verification failed errors
    if (error.response?.status === 401 || 
        (error.response?.status === 422 && error.response?.data?.msg?.includes('Signature verification failed'))) {
      console.log('Clearing invalid auth token due to authentication error');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  google: (data) => api.post('/auth/google', data),
  apple: (data) => api.post('/auth/apple', data),
  getCurrentUser: () => api.get('/auth/me'),
  deleteAccount: () => api.delete('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Workout APIs
export const workoutAPI = {
  getWorkouts: (params) => api.get('/workouts', { params }),
  getWorkout: (id) => api.get(`/workouts/${id}`),
  createWorkout: (data) => api.post('/workouts', data),
  updateWorkout: (id, data) => api.put(`/workouts/${id}`, data),
  deleteWorkout: (id) => api.delete(`/workouts/${id}`),
  getStats: () => api.get('/workouts/stats'),
  getRoutines: () => api.get('/workouts/routines'),
  getRoutine: (id) => api.get(`/workouts/routines/${id}`),
  createRoutine: (data) => api.post('/workouts/routines', data),
};

// Exercise APIs
export const exerciseAPI = {
  getExercises: (params) => api.get('/exercises', { params }),
  getExercise: (id) => api.get(`/exercises/${id}`),
  createExercise: (data) => api.post('/exercises', data),
};


// Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  getStats: () => api.get('/profile/stats'),
};

// Class APIs
export const classAPI = {
  getClasses: () => api.get('/classes'),
  getClass: (id) => api.get(`/classes/${id}`),
  createClass: (data) => api.post('/classes', data),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),
  joinClass: (data) => api.post('/classes/join', data),
  getMembers: (id) => api.get(`/classes/${id}/members`),
  removeMember: (classId, studentId) => api.delete(`/classes/${classId}/members/${studentId}`),
  getJoinRequests: (classId) => api.get(`/classes/${classId}/join-requests`),
  acceptJoinRequest: (classId, requestId) => api.post(`/classes/${classId}/join-requests/${requestId}/accept`),
  rejectJoinRequest: (classId, requestId) => api.post(`/classes/${classId}/join-requests/${requestId}/reject`),
  assignWorkout: (classId, data) => api.post(`/classes/${classId}/assign-workout`, data),
  getAssignedWorkouts: (classId) => api.get(`/classes/${classId}/assigned-workouts`),
  getAssignedWorkout: (classId, workoutId) => api.get(`/classes/${classId}/assigned-workouts/${workoutId}`),
  updateAssignedWorkout: (classId, workoutId, data) => api.put(`/classes/${classId}/assigned-workouts/${workoutId}`, data),
  deleteAssignedWorkout: (classId, workoutId) => api.delete(`/classes/${classId}/assigned-workouts/${workoutId}`),
  completeWorkout: (classId, workoutId, data) => api.post(`/classes/${classId}/assigned-workouts/${workoutId}/complete`, data),
  getLeaderboard: (classId) => api.get(`/classes/${classId}/leaderboard`),
  getClassStats: (classId) => api.get(`/classes/${classId}/stats`),
};

// Macro APIs
export const macroAPI = {
  getDashboard: (date) => api.get('/macros/dashboard', { params: { date } }),
  getGoals: () => api.get('/macros/goals'),
  updateGoals: (data) => api.put('/macros/goals', data),
  getMeals: (date) => api.get('/macros/meals', { params: { date } }),
  createMeal: (data) => api.post('/macros/meals', data),
  updateMeal: (id, data) => api.put(`/macros/meals/${id}`, data),
  deleteMeal: (id) => api.delete(`/macros/meals/${id}`),
};

export default api;

