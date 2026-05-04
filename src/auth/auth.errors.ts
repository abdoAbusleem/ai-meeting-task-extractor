export const AuthErrors = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_INACTIVE: 'User account is inactive',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  SESSION_VERSION_INVALID: 'Session version is invalid',
  INVALID_TOKEN_PAYLOAD: 'Invalid token payload',
  NEW_PASSWORD_MUST_BE_DIFFERENT: 'New password must be different from the old password',
  PASSWORD_INCORRECT: 'Current password is incorrect',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
} as const;