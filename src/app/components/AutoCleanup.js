"use client";

import { useEffect } from 'react';
import { useAuth } from '@/app/lib/auth-context';

export default function AutoCleanup() {
  const { user } = useAuth();

  useEffect(() => {
    // Only run cleanup if user is logged in
    if (!user) return;

    const performCleanup = async () => {
      try {
        const response = await fetch('/api/events/cleanup', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.deletedEvents > 0 || result.deletedEnrollments > 0) {
            console.log(`Auto-cleanup completed: ${result.deletedEvents} events, ${result.deletedEnrollments} enrollments removed`);
          }
        }
      } catch (error) {
        console.warn('Auto-cleanup failed:', error);
      }
    };

    // Run cleanup on component mount
    performCleanup();

    // Set up periodic cleanup (every 30 minutes)
    const interval = setInterval(performCleanup, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // This component doesn't render anything
  return null;
}
