const env = import.meta.env

export const paymentInstructions = {
  JazzCash: { recipient: env.VITE_JAZZCASH_RECEIVING_ACCOUNT || 'Receiving account not configured', note: 'Send from an account in your own name, then enter the transaction ID.' },
  Easypaisa: { recipient: env.VITE_EASYPAISA_RECEIVING_ACCOUNT || 'Receiving account not configured', note: 'Send from an account in your own name, then enter the transaction ID.' },
  SadaPay: { recipient: env.VITE_SADAPAY_RECEIVING_ACCOUNT || 'Receiving account not configured', note: 'Transfer the exact amount and retain your payment reference.' },
  NayaPay: { recipient: env.VITE_NAYAPAY_RECEIVING_ACCOUNT || 'Receiving account not configured', note: 'Transfer the exact amount and retain your payment reference.' },
  'Pakistani Bank Account': { recipient: env.VITE_BANK_RECEIVING_DETAILS || 'Receiving bank details not configured', note: 'Use your selected bank to transfer the exact amount and retain the bank reference.' },
}
