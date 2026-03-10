interface ProfileMemoryRecord<T> {
  userId: string;
  data: T;
}

let profileMemory: ProfileMemoryRecord<unknown> | null = null;

export function readProfileFromMemory<T>(userId: string): T | null {
  if (!profileMemory || profileMemory.userId !== userId) {
    return null;
  }

  return profileMemory.data as T;
}

export function writeProfileToMemory<T>(userId: string, data: T): void {
  profileMemory = {
    userId,
    data,
  };
}

export function clearProfileMemory(userId?: string): void {
  if (!profileMemory) {
    return;
  }

  if (!userId || profileMemory.userId === userId) {
    profileMemory = null;
  }
}
