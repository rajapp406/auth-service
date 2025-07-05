import cluster from 'cluster';
import os from 'os';
import { Logger } from './infrastructure/logging/Logger';

const logger = Logger.getInstance();
const numCPUs = os.cpus().length;

export class ClusterManager {
  private static instance: ClusterManager;

  private constructor() {}

  public static getInstance(): ClusterManager {
    if (!ClusterManager.instance) {
      ClusterManager.instance = new ClusterManager();
    }
    return ClusterManager.instance;
  }

  public start(): void {
    if (cluster.isPrimary) {
      logger.info(`Primary ${process.pid} is running`);
      logger.info(`Starting ${numCPUs} workers...`);

      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        logger.error(`Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`);
        logger.info('Starting a new worker...');
        cluster.fork();
      });

      // Handle signals in primary process
      process.on('SIGTERM', () => this.handleSignal('SIGTERM'));
      process.on('SIGINT', () => this.handleSignal('SIGINT'));
    }
  }

  private handleSignal(signal: string): void {
    logger.info(`${signal} received in primary process. Shutting down workers...`);
    
    // Gracefully shutdown all workers
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        worker.send('shutdown');
      }
    }

    // Wait for all workers to exit
    let workersAlive = Object.keys(cluster.workers || {}).length;
    const checkWorkers = setInterval(() => {
      if (workersAlive === 0) {
        clearInterval(checkWorkers);
        logger.info('All workers shut down. Exiting primary process.');
        process.exit(0);
      }
    }, 1000);

    // Force exit after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
} 