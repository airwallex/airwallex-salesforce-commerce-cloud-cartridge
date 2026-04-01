/**
 * Process Webhook Queue Job
 * Scheduled job to process queued webhook events
 *
 * This job runs every 5 minutes to:
 * 1. Fetch pending webhook events from the queue
 * 2. Process each event
 * 3. Mark events as completed or failed
 * 4. Retry failed events up to MAX_RETRIES times
 * 5. Clean up old completed events
 */

import logger from '../helpers/logger';
import Status = require('dw/system/Status');
import WebhookEvent from '../airwallex/models/WebhookEvent';
import { processEvent } from '../services/webhookProcessor';
import {
  dequeueWebhookEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  incrementRetryCount,
  cleanupCompletedEvents,
  getEventCountByStatus,
  QUEUE_STATUS,
  WebhookQueueItem,
} from '../helpers/webhookQueueHelper';

/**
 * Maximum number of retries before marking an event as permanently failed
 */
const MAX_RETRIES = 3;

/**
 * Default batch size for processing events
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Number of days to keep completed events before cleanup
 */
const CLEANUP_DAYS = 30;

/**
 * Process a single webhook event
 * @param item - Queue item to process
 * @returns true if processed successfully, false otherwise
 */
const processQueueItem = (item: WebhookQueueItem): boolean => {
  try {
    // Mark as processing
    markEventProcessing(item.eventId);

    // Parse the event from payload
    const event = WebhookEvent.parse(item.payload);
    if (!event) {
      logger.error('Failed to parse queued webhook event', { eventId: item.eventId });
      markEventFailed(item.eventId, 'Failed to parse event payload');
      return false;
    }

    // Process the event
    const result = processEvent(event);

    if (result.success) {
      markEventCompleted(item.eventId);
      return true;
    }

    // Processing failed - check if we should retry
    const newRetryCount = incrementRetryCount(item.eventId);

    if (newRetryCount >= MAX_RETRIES) {
      // Max retries exceeded - mark as permanently failed
      markEventFailed(item.eventId, result.error || 'Max retries exceeded');
      logger.error('Webhook event failed after max retries', {
        eventId: item.eventId,
        eventName: item.eventName,
        retryCount: newRetryCount,
        error: result.error,
      });
    } else {
      logger.warn('Webhook event processing failed, will retry', {
        eventId: item.eventId,
        eventName: item.eventName,
        retryCount: newRetryCount,
        maxRetries: MAX_RETRIES,
        error: result.error,
      });
    }

    return false;
  } catch (e) {
    const error = e as Error;
    logger.error('Error processing queue item', error);

    // Increment retry count on exception
    const newRetryCount = incrementRetryCount(item.eventId);
    if (newRetryCount >= MAX_RETRIES) {
      markEventFailed(item.eventId, error.message);
    }

    return false;
  }
};

/**
 * Execute the webhook queue processing job
 * @param params - Job parameters
 * @param params.batchSize - Maximum number of events to process (default: 100)
 * @param stepExecution - Job step execution context
 */
const execute = (params: { batchSize?: number }): Status => {
  const startTime = Date.now();
  const batchSize = params.batchSize || DEFAULT_BATCH_SIZE;

  logger.info('Starting webhook queue processing job', { batchSize });

  // Get queue stats before processing
  const pendingCount = getEventCountByStatus(QUEUE_STATUS.PENDING);
  const failedCount = getEventCountByStatus(QUEUE_STATUS.FAILED);

  logger.info('Queue status before processing', {
    pending: pendingCount,
    failed: failedCount,
  });

  // Dequeue events for processing
  const items = dequeueWebhookEvents(batchSize);

  // Process each event
  let successCount = 0;
  let errorCount = 0;

  if (items.length === 0) {
    logger.info('No pending webhook events to process');
  } else {
    logger.info('Processing queued webhook events', { count: items.length });

    for (const item of items) {
      const success = processQueueItem(item);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
  }

  // Cleanup old completed events (always run)
  const cleanedCount = cleanupCompletedEvents(CLEANUP_DAYS);

  // Get queue stats after processing
  const remainingPending = getEventCountByStatus(QUEUE_STATUS.PENDING);
  const totalFailed = getEventCountByStatus(QUEUE_STATUS.FAILED);

  const duration = Date.now() - startTime;

  logger.info('Webhook queue processing job completed', {
    processed: items.length,
    success: successCount,
    errors: errorCount,
    cleaned: cleanedCount,
    remainingPending,
    totalFailed,
    durationMs: duration,
  });

  // Return OK even if some events failed - they'll be retried
  return new Status(Status.OK);
};

module.exports = {
  execute,
};

export { execute };
