/**
 * SMS Notification Service
 * Sends SMS alerts using Twilio (or your preferred SMS provider)
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Send SMS notification for price drop
 * @param {string} phoneNumber - User's phone number (E.164 format)
 * @param {string} productName - Product name
 * @param {number} newPrice - New price
 * @param {string} productUrl - Product URL
 */
export async function notifySMS(phoneNumber, productName, newPrice, productUrl) {
  // Check if SMS is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ SMS notifications not configured (Twilio credentials missing)');
    return;
  }
  
  try {
    // Dynamically import Twilio only if credentials are present
    const twilio = await import('twilio');
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const message = `🎉 Price Drop Alert!\n\n${productName} is now $${newPrice}\n\nCheck it out: ${productUrl}`;
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`✅ SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    throw error;
  }
}
