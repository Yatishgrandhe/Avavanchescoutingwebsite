import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

export type QueueItemType = 'match-scouting' | 'pit-scouting';

export interface QueueItem {
  id: string; // Unique identifier for the queue item
  type: QueueItemType;
  data: any; // The payload to be sent to the server
  metadata: {
    competitionKey: string;
    organizationId: string;
    teamNumber: number;
    matchKey?: string; // Optional, used for match-scouting
    queuedAt: string; // ISO string
  };
}

const QUEUE_KEY = 'avalanche-offline-queue';

/**
 * Retrieves all items currently in the offline queue.
 */
export async function getOfflineQueue(): Promise<QueueItem[]> {
  try {
    const queue = await get<QueueItem[]>(QUEUE_KEY);
    return queue || [];
  } catch (err) {
    console.error('Failed to get offline queue', err);
    return [];
  }
}

/**
 * Adds an item to the offline queue.
 */
export async function addToOfflineQueue(
  type: QueueItemType,
  data: any,
  metadata: Omit<QueueItem['metadata'], 'queuedAt'>
): Promise<void> {
  const currentQueue = await getOfflineQueue();
  const newItem: QueueItem = {
    id: uuidv4(),
    type,
    data,
    metadata: {
      ...metadata,
      queuedAt: new Date().toISOString()
    }
  };
  
  await set(QUEUE_KEY, [...currentQueue, newItem]);
}

/**
 * Removes a specific item from the offline queue.
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const currentQueue = await getOfflineQueue();
  const updatedQueue = currentQueue.filter(item => item.id !== id);
  await set(QUEUE_KEY, updatedQueue);
}

/**
 * Clears the entire offline queue.
 */
export async function clearOfflineQueue(): Promise<void> {
  await del(QUEUE_KEY);
}
