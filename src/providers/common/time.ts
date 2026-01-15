export const calculateResetAfterSeconds = (
  resetAt: number | null,
  now: number = Date.now()
): number | null => {
  if (!resetAt) {
    return null;
  }

  const diffMs = resetAt - now;
  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / 1000);
};

export const calculateResetAt = (
  resetAfterSeconds: number | null,
  now: number = Date.now()
): number | null => {
  if (resetAfterSeconds === null || resetAfterSeconds === undefined) {
    return null;
  }

  return now + resetAfterSeconds * 1000;
};
