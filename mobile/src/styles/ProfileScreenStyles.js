import { StyleSheet } from 'react-native';
import colors from '../styles/colors';

export const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  menuCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  logoutButton: {
    width: '100%',
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteAccountText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
});

