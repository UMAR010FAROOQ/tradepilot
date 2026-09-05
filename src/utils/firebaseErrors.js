const firebaseErrorMessages = {
  'auth/email-already-in-use': 'An account already exists for this email address.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Use a stronger password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Unable to reach the authentication service. Check your connection.',
  'auth/user-disabled': 'This account is currently unavailable. Contact support for help.',
  'auth/operation-not-allowed': 'Email and password sign-in is not enabled yet.',
  'auth/wrong-password': 'The current password is incorrect.',
  'auth/requires-recent-login': 'Please sign in again before changing your password.',
  'auth/requires-authentication': 'Sign in before requesting another verification email.',
  'auth/quota-exceeded': 'Verification email limits were reached. Please try again later.',
}

export function getFirebaseErrorMessage(error) {
  return (
    firebaseErrorMessages[error?.code] ||
    'Something went wrong while processing your request. Please try again.'
  )
}
