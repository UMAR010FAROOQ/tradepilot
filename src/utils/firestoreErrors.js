const firestoreErrorMessages = {
  'permission-denied': 'You do not have permission to perform this action.',
  'unavailable': 'The data service is temporarily unavailable. Check your connection and retry.',
  'failed-precondition': 'This request needs additional Firebase configuration before it can run.',
  'account/initialization-failed': 'Your account was created, but its wallet setup is incomplete. Please retry.',
  'account/wallet-missing': 'Your wallet has not been initialized yet.',
  'account/already-initialized': 'Your account is already initialized.',
  'validation/invalid-amount': 'Enter an amount greater than zero.',
  'validation/missing-method': 'Select a payment method.',
  'validation/missing-destination': 'Enter a withdrawal destination.',
  'validation/missing-reference': 'Enter a reference or transaction ID.',
}

export function getFirestoreErrorMessage(error) {
  return (
    firestoreErrorMessages[error?.code] ||
    'Unable to complete the request right now. Please try again.'
  )
}

export function createServiceError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}
