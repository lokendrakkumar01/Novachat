// ============================================================
// NovaChat - SMS Service (Twilio)
// ============================================================
const twilio = require("twilio");

let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

/**
 * Send SMS OTP via Twilio
 */
const sendPhoneOTP = async (phone, otp) => {
  try {
    const client = getTwilioClient();
    await client.messages.create({
      body: `Your NovaChat verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return { success: true };
  } catch (error) {
    console.error("Twilio SMS error:", error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

/**
 * Verify Twilio phone number (lookup)
 */
const lookupPhone = async (phone) => {
  try {
    const client = getTwilioClient();
    const result = await client.lookups.v2.phoneNumbers(phone).fetch();
    return { valid: result.valid, phoneNumber: result.phoneNumber };
  } catch (error) {
    return { valid: false };
  }
};

module.exports = { sendPhoneOTP, lookupPhone };
