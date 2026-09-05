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
  'validation/missing-account-name': 'Enter the account holder name.',
  'validation/missing-account': 'Enter the account or mobile number.',
  'validation/missing-bank': 'Select a Pakistani bank.',
  'validation/invalid-mobile': 'Enter a valid Pakistani mobile number, for example 03XX XXXXXXX.',
  'validation/missing-reason': 'Enter a reason before rejecting this request.',
  'admin/unauthorized': 'Administrator access is required for this action.',
  'admin/invalid-role': 'Choose either the User or Admin role.',
  'admin/self-role-change': 'You cannot change your own role.',
  'admin/user-missing': 'The selected user no longer exists.',
  'admin/request-missing': 'This request no longer exists.',
  'admin/request-processed': 'This request has already been processed.',
  'admin/wallet-missing': 'The user wallet could not be found.',
  'admin/insufficient-balance': 'The wallet no longer has enough available balance.',
  'trading/insufficient-balance': 'Insufficient balance.',
  'trading/position-missing': 'No open position is available to sell.',
  'trading/quantity-exceeded': 'Sell quantity exceeds your position.',
  'trading/minimum': 'Trade amount must be at least $1.',
  'trading/invalid-quantity': 'Enter a valid quantity greater than zero.',
  'trading/market-unavailable': 'Market price is currently unavailable.',
  'trading/invalid-limit-price': 'Enter a valid limit price.',
  'trading/invalid-stop-loss': 'Stop loss must be below the entry price.',
  'trading/invalid-take-profit': 'Take profit must be above the entry price.',
  'trading/order-missing': 'This order no longer exists.',
  'trading/order-filled': 'This order has already been filled.',
  'trading/order-cancelled': 'This order has already been cancelled.',
  'trading/order-condition': 'The limit price condition is not currently satisfied.',
  'forex/live-required': 'Live Forex data is required to place a simulated Forex order.',
  'forex/market-closed': 'Forex market is currently closed.',
  'forex/stale-price': 'The latest Forex price is stale. Please try again later.',
  'forex/provider-unavailable': 'Live Forex data is temporarily unavailable.',
  aborted: 'Your account data changed. Please try again.',
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
