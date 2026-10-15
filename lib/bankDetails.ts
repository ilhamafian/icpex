import "server-only";

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
};

/** Public transfer instructions. Null when any of the three env values is missing. */
export function readBankDetails(): BankDetails | null {
  const bankName = process.env.BANK_NAME?.trim();
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim();
  if (!bankName || !accountName || !accountNumber) return null;
  return { bankName, accountName, accountNumber };
}
