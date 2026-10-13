let accountId: string | undefined;

export function setStorageAccount(userId: string) {
  accountId = userId;
}

export function getStorageAccount() {
  return accountId;
}
