import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AccountRestricted from '../src/components/auth/AccountRestricted.jsx'
import MaintenanceScreen from '../src/components/auth/MaintenanceScreen.jsx'
import Button from '../src/components/common/Button.jsx'
import { AuthContext } from '../src/context/AuthContext.jsx'

const withAuth = (child) => renderToStaticMarkup(<AuthContext.Provider value={{ logout: () => {} }}>{child}</AuthContext.Provider>)

describe('critical component smoke tests', () => {
  it('renders an accessible button label and safe default type', () => { const html = renderToStaticMarkup(<Button>Confirm order</Button>); expect(html).toContain('type="button"'); expect(html).toContain('Confirm order') })
  it('renders suspended-account actions without internal reasons', () => { const html = withAuth(<AccountRestricted status="suspended" />); expect(html).toContain('Account Suspended'); expect(html).toContain('Contact Support'); expect(html).toContain('Sign out'); expect(html).not.toContain('admin note') })
  it('renders maintenance status and sign-out control', () => { const html = withAuth(<MaintenanceScreen />); expect(html).toContain('TradePilot Maintenance'); expect(html).toContain('Sign out') })
})
