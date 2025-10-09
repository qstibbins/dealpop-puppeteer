// utils/notifyUser.js
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// TODO: REMOVE HARDCODED EMAIL
async function notifyUser(userEmail, productTitle, newPrice, productUrl) {
  const msg = {
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'quinton.stibbins@gmail.com', // use verified sender from .env
    subject: `Price Drop Alert: ${productTitle}`,
    text: `Good news! "${productTitle}" is now $${newPrice}.\n\nCheck it out: ${productUrl}`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${userEmail}`);
  } catch (err) {
    console.error("Error sending email:", err.response?.body || err.message);
  }
}

export { notifyUser };