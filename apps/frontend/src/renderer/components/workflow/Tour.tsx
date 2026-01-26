/**
 * Workflow Studio Tour Component
 * ===============================
 *
 * Provides an interactive guided tour for first-time users using Driver.js
 */

import React, { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';
import { getTourSteps, getDriverConfig } from './tour-steps';

interface TourProps {
  run: boolean;
  onFinish: () => void;
}

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
  const driverRef = useRef<Driver | null>(null);
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
        const { driver } = await import('driver.js');
        await import('driver.js/dist/driver.css');

        // Initialize driver instance
        if (!driverRef.current) {
          const config = getDriverConfig();
          driverRef.current = driver({
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
          });
        }

        // Start or stop tour based on run prop
        if (run && driverRef.current) {
          const steps = getTourSteps();
          driverRef.current.setSteps(steps);
          driverRef.current.drive();
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
