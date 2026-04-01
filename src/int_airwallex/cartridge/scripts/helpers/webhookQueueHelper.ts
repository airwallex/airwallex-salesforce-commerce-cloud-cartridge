/**
 * Webhook Queue Helper
 * Manages the AirwallexWebhookEvent custom object queue
 */

import CustomObjectMgr = require('dw/object/CustomObjectMgr');
import Transaction = require('dw/system/Transaction');
import logger from './logger';
import WebhookEvent from '../airwallex/models/WebhookEvent';

const CUSTOM_OBJECT_TYPE = 'AirwallexWebhookEvent';

/**
 * Webhook queue status values
 */
export const QUEUE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type QueueStatus = (typeof QUEUE_STATUS)[keyof typeof QUEUE_STATUS];

/**
 * Webhook queue item interface
 */
export interface WebhookQueueItem {
  eventId: string;
  eventName: string;
  payload: string;
  status: QueueStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date | null;
  processedAt: Date | null;
}

/**
 * Enqueue a webhook event for async processing
 */
export const enqueueWebhookEvent = (event: WebhookEvent, payload: string): void => {
  try {
    Transaction.wrap(() => {
      // Check if event already exists to prevent duplicates
      const existing = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, event.id);
      if (existing) {
        logger.info('Webhook event already queued', { eventId: event.id });
        return;
      }

      const customObject = CustomObjectMgr.createCustomObject(CUSTOM_OBJECT_TYPE, event.id);
      customObject.custom.eventId = event.id;
      customObject.custom.eventName = event.name;
      customObject.custom.payload = payload;
      customObject.custom.status = QUEUE_STATUS.PENDING;
      customObject.custom.retryCount = 0;
      customObject.custom.createdAt = new Date();

      logger.info('Webhook event enqueued', { eventId: event.id, eventName: event.name });
    });
  } catch (e) {
    logger.error('Failed to enqueue webhook event', e as Error);
    throw e;
  }
};

/**
 * Dequeue webhook events for processing
 */
export const dequeueWebhookEvents = (limit: number = 100): WebhookQueueItem[] => {
  const items: WebhookQueueItem[] = [];

  try {
    // Query for PENDING events, ordered by creation date
    const queryResult = CustomObjectMgr.queryCustomObjects(
      CUSTOM_OBJECT_TYPE,
      'custom.status = {0}',
      'custom.createdAt asc',
      QUEUE_STATUS.PENDING,
    );

    let count = 0;
    while (queryResult.hasNext() && count < limit) {
      const customObject = queryResult.next();
      items.push({
        eventId: customObject.custom.eventId as string,
        eventName: customObject.custom.eventName as string,
        payload: customObject.custom.payload as string,
        status: customObject.custom.status as QueueStatus,
        retryCount: (customObject.custom.retryCount as number) || 0,
        errorMessage: (customObject.custom.errorMessage as string) || null,
        createdAt: (customObject.custom.createdAt as Date) || null,
        processedAt: (customObject.custom.processedAt as Date) || null,
      });
      count++;
    }

    queryResult.close();
  } catch (e) {
    logger.error('Failed to dequeue webhook events', e as Error);
  }

  return items;
};

/**
 * Mark an event as currently being processed
 */
export const markEventProcessing = (eventId: string): void => {
  try {
    Transaction.wrap(() => {
      const customObject = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, eventId);
      if (customObject) {
        customObject.custom.status = QUEUE_STATUS.PROCESSING;
      }
    });
  } catch (e) {
    logger.error('Failed to mark event as processing', e as Error);
  }
};

/**
 * Mark an event as successfully processed
 */
export const markEventCompleted = (eventId: string): void => {
  try {
    Transaction.wrap(() => {
      const customObject = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, eventId);
      if (customObject) {
        customObject.custom.status = QUEUE_STATUS.COMPLETED;
        customObject.custom.processedAt = new Date();
      }
    });
    logger.info('Webhook event completed', { eventId });
  } catch (e) {
    logger.error('Failed to mark event as completed', e as Error);
  }
};

/**
 * Mark an event as failed with error message
 */
export const markEventFailed = (eventId: string, errorMessage: string): void => {
  try {
    Transaction.wrap(() => {
      const customObject = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, eventId);
      if (customObject) {
        customObject.custom.status = QUEUE_STATUS.FAILED;
        customObject.custom.errorMessage = errorMessage;
        customObject.custom.processedAt = new Date();
      }
    });
    logger.error('Webhook event marked as failed', { eventId, errorMessage });
  } catch (e) {
    logger.error('Failed to mark event as failed', e as Error);
  }
};

/**
 * Increment retry count for an event
 */
export const incrementRetryCount = (eventId: string): number => {
  let newCount = 0;
  try {
    Transaction.wrap(() => {
      const customObject = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, eventId);
      if (customObject) {
        newCount = ((customObject.custom.retryCount as number) || 0) + 1;
        customObject.custom.retryCount = newCount;
        customObject.custom.status = QUEUE_STATUS.PENDING; // Reset to pending for retry
      }
    });
  } catch (e) {
    logger.error('Failed to increment retry count', e as Error);
  }
  return newCount;
};

/**
 * Remove completed events older than the specified number of days
 */
export const cleanupCompletedEvents = (daysOld: number = 7): number => {
  let removedCount = 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    Transaction.wrap(() => {
      const queryResult = CustomObjectMgr.queryCustomObjects(
        CUSTOM_OBJECT_TYPE,
        'custom.status = {0} AND custom.processedAt < {1}',
        'custom.processedAt asc',
        QUEUE_STATUS.COMPLETED,
        cutoffDate,
      );

      while (queryResult.hasNext()) {
        const customObject = queryResult.next();
        CustomObjectMgr.remove(customObject);
        removedCount++;
      }

      queryResult.close();
    });

    if (removedCount > 0) {
      logger.info('Cleaned up completed webhook events', { removedCount, daysOld });
    }
  } catch (e) {
    logger.error('Failed to cleanup completed events', e as Error);
  }

  return removedCount;
};

/**
 * Get count of events by status
 */
export const getEventCountByStatus = (status: QueueStatus): number => {
  try {
    const queryResult = CustomObjectMgr.queryCustomObjects(
      CUSTOM_OBJECT_TYPE,
      'custom.status = {0}',
      'custom.createdAt asc',
      status,
    );

    let count = 0;
    while (queryResult.hasNext()) {
      queryResult.next();
      count++;
    }
    queryResult.close();

    return count;
  } catch (e) {
    logger.error('Failed to get event count', e as Error);
    return 0;
  }
};

module.exports = {
  QUEUE_STATUS,
  enqueueWebhookEvent,
  dequeueWebhookEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  incrementRetryCount,
  cleanupCompletedEvents,
  getEventCountByStatus,
};

export default {
  QUEUE_STATUS,
  enqueueWebhookEvent,
  dequeueWebhookEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  incrementRetryCount,
  cleanupCompletedEvents,
  getEventCountByStatus,
};
