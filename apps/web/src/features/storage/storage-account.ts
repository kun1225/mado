let accountId: string | undefined;

export function setStorageAccount(userId: string) {
  accountId = userId;
}

// *** getStorageAccount ***
export function getStorageAccount() {
  return accountId;
}
