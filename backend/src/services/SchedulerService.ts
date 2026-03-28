/**
 * Scheduler Service for running automated tasks
 * Uses node-cron to schedule daily lifecycle checks
 */

import cron from 'node-cron';
import { SubscriptionLifecycleService } from './SubscriptionLifecycleService';

export class SchedulerService {
  private lifecycleService: SubscriptionLifecycleService;
  private lifecycleTask: cron.ScheduledTask | null = null;

  constructor() {
    this.lifecycleService = new SubscriptionLifecycleService();
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    // Run lifecycle check daily at 9:00 AM
    this.lifecycleTask = cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Running scheduled subscription lifecycle check...');
      await this.lifecycleService.runLifecycleCheck();
    });

    console.log('✓ Scheduler started - Lifecycle checks will run daily at 9:00 AM');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (this.lifecycleTask) {
      this.lifecycleTask.stop();
      console.log('✓ Scheduler stopped');
    }
  }

  /**
   * Run lifecycle check immediately (for testing)
   */
  async runLifecycleCheckNow(): Promise<void> {
    console.log('🔔 Running immediate subscription lifecycle check...');
    await this.lifecycleService.runLifecycleCheck();
  }

  /**
   * Get lifecycle service for manual operations
   */
  getLifecycleService(): SubscriptionLifecycleService {
    return this.lifecycleService;
  }
}
