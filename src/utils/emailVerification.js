export function isEmailPasswordAccount(user) {
  return Boolean(user?.providerData?.some((provider) => provider.providerId === 'password'))
}

export function needsEmailVerification(user) {
  return Boolean(user && isEmailPasswordAccount(user) && !user.emailVerified)
}
