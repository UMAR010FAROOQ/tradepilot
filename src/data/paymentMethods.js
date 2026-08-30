export const paymentMethods = [
  { value: 'JazzCash', label: 'JazzCash', category: 'Mobile wallet', accountLabel: 'JazzCash mobile number', placeholder: '03XX XXXXXXX' },
  { value: 'Easypaisa', label: 'Easypaisa', category: 'Mobile wallet', accountLabel: 'Easypaisa mobile number', placeholder: '03XX XXXXXXX' },
  { value: 'SadaPay', label: 'SadaPay', category: 'Digital bank', accountLabel: 'SadaPay account number', placeholder: 'Enter account number' },
  { value: 'NayaPay', label: 'NayaPay', category: 'Digital bank', accountLabel: 'NayaPay account number', placeholder: 'Enter account number' },
  { value: 'Pakistani Bank Account', label: 'Pakistani bank account', category: 'Bank transfer', accountLabel: 'IBAN or account number', placeholder: 'PK00 BANK 0000 0000 0000 0000' },
]

export const pakistaniBanks = [
  'Allied Bank Limited', 'Askari Bank', 'Bank Alfalah', 'Bank Al Habib', 'BankIslami Pakistan',
  'Faysal Bank', 'Habib Bank Limited', 'Habib Metropolitan Bank', 'JS Bank', 'MCB Bank',
  'Meezan Bank', 'National Bank of Pakistan', 'Standard Chartered Pakistan', 'Soneri Bank',
  'The Bank of Punjab', 'United Bank Limited', 'Silkbank', 'Sindh Bank', 'Dubai Islamic Bank Pakistan', 'Other',
]

export const paymentMethodByValue = new Map(paymentMethods.map((method) => [method.value, method]))

export function isBankMethod(method) {
  return method === 'Pakistani Bank Account'
}
