const rawBuildId = (import.meta.env.VITE_BUILD_ID || 'local').trim()
export const buildInfo = Object.freeze({ version: import.meta.env.VITE_APP_VERSION || '0.0.0', buildId: rawBuildId === 'local' ? rawBuildId : rawBuildId.slice(0, 7), environment: import.meta.env.VITE_APP_ENV || (import.meta.env.PROD ? 'Production' : 'Development') })
