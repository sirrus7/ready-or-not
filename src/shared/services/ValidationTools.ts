// src/shared/services/ValidationTools.ts


import { supabase } from '@shared/services/supabase';

/**
 * Test result interface
 */
export interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
  error?: string;
  details?: any;
}

/**
 * Tests whether the database is accessible by performing a simple query
 * @returns Promise with test result including connection time
 */
export async function testDatabaseConnection(): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    
    const duration = performance.now() - startTime;
    
    if (error) {
      return {
        success: false,
        message: 'Database connection failed',
        duration,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      message: `Database is responsive`,
      duration,
      details: { recordsReturned: data?.length || 0 }
    };
  } catch (error: any) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      message: 'Database connection error',
      duration,
      error: error.message || 'Unknown error',
      details: error
    };
  }
}

/**
 * Opens a realtime channel and sends a test message
 */
export async function testRealtimeChannelSend(
  channelName: string = 'test-channel',
  testMessage: any = { type: 'test', timestamp: Date.now() }
): Promise<TestResult> {
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    try {
      const channel = supabase.channel(channelName);
      let subscribed = false;
      let messageSent = false;
      
      const timeout = setTimeout(() => {
        if (!subscribed || !messageSent) {
          channel.unsubscribe();
          resolve({
            success: false,
            message: 'Realtime channel subscription or send timeout',
            duration: performance.now() - startTime,
            error: 'Timeout waiting for channel subscription or message send'
          });
        }
      }, 10000);
      
      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          
          const sendResult = await channel.send({
            type: 'broadcast',
            event: 'test-message',
            payload: testMessage
          });
          
          messageSent = true;
          const duration = performance.now() - startTime;
          
          clearTimeout(timeout);
          
          setTimeout(() => {
            channel.unsubscribe();
          }, 1000);
          
          resolve({
            success: sendResult === 'ok',
            message: sendResult === 'ok' 
              ? `Message sent successfully on channel '${channelName}' (${duration.toFixed(2)}ms)` 
              : 'Message send failed',
            duration,
            details: { 
              channelName, 
              status: sendResult,
              messagePayload: testMessage 
            }
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          channel.unsubscribe();
          
          resolve({
            success: false,
            message: `Channel subscription failed: ${status}`,
            duration: performance.now() - startTime,
            error: status
          });
        }
      });
    } catch (error: any) {
      resolve({
        success: false,
        message: 'Error creating realtime channel',
        duration: performance.now() - startTime,
        error: error.message || 'Unknown error',
        details: error
      });
    }
  });
}

/**
 * Receives a test message from a given realtime channel
 */
export async function testRealtimeChannelReceive(
  channelName: string = 'test-channel',
  timeoutMs: number = 15000
): Promise<TestResult> {
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    try {
      const channel = supabase.channel(channelName);
      let messageReceived = false;
      
      const timeout = setTimeout(() => {
        if (!messageReceived) {
          channel.unsubscribe();
          resolve({
            success: false,
            message: `No message received on channel '${channelName}' within ${timeoutMs}ms`,
            duration: performance.now() - startTime,
            error: 'Timeout waiting for message'
          });
        }
      }, timeoutMs);
      
      channel
        .on('broadcast', { event: 'test-message' }, (payload: any) => {
          if (!messageReceived) {
            messageReceived = true;
            const duration = performance.now() - startTime;
            
            clearTimeout(timeout);
            
            setTimeout(() => {
              channel.unsubscribe();
            }, 500);
            
            resolve({
              success: true,
              message: `Message received on channel '${channelName}' (${duration.toFixed(2)}ms)`,
              duration,
              details: {
                channelName,
                receivedPayload: payload
              }
            });
          }
        })
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            channel.unsubscribe();
            
            if (!messageReceived) {
              resolve({
                success: false,
                message: `Channel subscription failed: ${status}`,
                duration: performance.now() - startTime,
                error: status
              });
            }
          }
        });
    } catch (error: any) {
      resolve({
        success: false,
        message: 'Error setting up realtime listener',
        duration: performance.now() - startTime,
        error: error.message || 'Unknown error',
        details: error
      });
    }
  });
}

/**
 * Downloads a test file from Supabase storage and times the download speed
 */
export async function testStorageDownloadSpeed(
  bucketName: string = 'slide-content',
  filePath: string = 'Slide_007.mp4'
): Promise<TestResult> {
  const startTime = performance.now();
    
  try {
    // Step 1: Get signed URL (same as MediaManager)
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, 300); // 5 min expiry
    
    if (error) {
      return {
        success: false,
        message: `Failed to create signed URL: ${error.message}`,
        duration: performance.now() - startTime,
        error: error.message,
        details: error
      };
    }
    
    if (!data?.signedUrl) {
      return {
        success: false,
        message: 'No signed URL returned',
        duration: performance.now() - startTime,
        error: 'Empty signed URL response'
      };
    }
    
    // Step 2: Fetch the file as blob (same as MediaManager bulk download)
    const response = await fetch(data.signedUrl);
    
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        errorBody = 'Could not read error response';
      }
      
      return {
        success: false,
        message: `Fetch failed: ${response.status} ${response.statusText}`,
        duration: performance.now() - startTime,
        error: `${response.status} ${response.statusText}`,
        details: {
          statusCode: response.status,
          statusText: response.statusText,
          errorBody
        }
      };
    }
    
    // Step 3: Download as blob
    const blob = await response.blob();
    const duration = performance.now() - startTime;
    
    // Calculate metrics
    const fileSizeBytes = blob.size;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const durationSeconds = duration / 1000;
    const downloadSpeedMBps = fileSizeMB / durationSeconds;
    
    return {
      success: true,
      message: `File downloaded successfully`,
      duration,
      details: {
        bucketName,
        filePath,
        fileSizeBytes,
        fileSizeMB: fileSizeMB.toFixed(2),
        downloadSpeedMBps: downloadSpeedMBps.toFixed(2),
        downloadSpeedMbps: (downloadSpeedMBps * 8).toFixed(2),
        blobType: blob.type
      }
    };
  } catch (error: any) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      message: 'Storage download error',
      duration,
      error: error.message || 'Unknown error',
      details: error
    };
  }
}