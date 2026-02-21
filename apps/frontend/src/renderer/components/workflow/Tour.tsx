/**
 * Workflow Studio Tour Component
 * ===============================
 *
 * Provides an interactive guided tour for first-time users using Driver.js
 */

import React, { useEffect, useRef } from 'react';
import { getTourSteps, getDriverConfig } from './tour-steps';

interface TourProps {
  run: boolean;
  onFinish: () => void;
}

// Type for driver instance - using any to avoid type conflicts
type DriverInstance = any;

/**
 * Tour Component
 *
 * Displays an interactive overlay tour that guides users through the workflow editor.
 * Uses Driver.js for the tour functionality.
 *
 * Note: Requires 'driver.js' package to be installed:
 * npm install driver.js
 */
export const Tour: React.FC<TourProps> = ({ run, onFinish }) => {
  const driverRef = useRef<DriverInstance | null>(null);
  const onFinishRef = useRef(onFinish);

  // Update onFinish ref when it changes
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Dynamically import driver.js to avoid build errors if not installed
    const initializeTour = async () => {
      try {
        // Dynamic import of driver.js
        const driverModule = await import('driver.js');
        const driverFactory = (driverModule as { driver?: (config?: unknown) => unknown }).driver;
        const DriverClass = (driverModule as { default?: new (config?: unknown) => unknown }).default;
        await import('driver.js/dist/driver.css');

        // Initialize driver instance
        if (!driverRef.current) {
          const config = getDriverConfig();
          const driverConfig = {
            ...config,
            onDestroyStarted: () => {
              // Called when tour is destroyed (completed, skipped, or closed)
              if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
              }
              // Call onFinish callback
              onFinishRef.current();
            },
            onCloseClick: () => {
              // Called when close button (X) is clicked
              if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
              }
              onFinishRef.current();
            },
          };

          if (typeof driverFactory === 'function') {
            driverRef.current = driverFactory(driverConfig);
          } else if (typeof DriverClass === 'function') {
            driverRef.current = new DriverClass(driverConfig);
          } else {
            throw new Error('Driver.js export not found');
          }
        }

        // Start or stop tour based on run prop
        if (run && driverRef.current) {
          const steps = getTourSteps();
          if (typeof driverRef.current.setSteps === 'function') {
            driverRef.current.setSteps(steps);
          } else if (typeof driverRef.current.defineSteps === 'function') {
            driverRef.current.defineSteps(steps);
          }
          if (typeof driverRef.current.drive === 'function') {
            driverRef.current.drive();
          } else if (typeof driverRef.current.start === 'function') {
            driverRef.current.start();
          }
        } else if (!run && driverRef.current) {
          driverRef.current.destroy();
          driverRef.current = null;
        }
      } catch (error) {
        console.warn('Driver.js not installed. Tour functionality is disabled.');
        console.warn('To enable tours, run: npm install driver.js');
        // Call onFinish immediately if driver.js is not available
        onFinishRef.current();
      }
    };

    if (run) {
      initializeTour();
    }

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [run]);

  return null;
};
