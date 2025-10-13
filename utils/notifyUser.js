// utils/notifyUser.js
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// TODO: REMOVE HARDCODED EMAIL
async function notifyUser(userEmail, productTitle, newPrice, productUrl) {
  const msg = {
    to: userEmail,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'quinton.stibbins@gmail.com',
      name: 'DealPop Price Alerts'  // Professional sender name
    },
    subject: `Price Drop Alert: ${productTitle}`,
    text: `Good news! "${productTitle}" is now $${newPrice}.\n\nCheck it out: ${productUrl}\n\n---\nTo stop receiving these alerts, reply with "UNSUBSCRIBE"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #2c3e50;">🎉 Price Drop Alert!</h2>
        <p><strong>${productTitle}</strong> is now <span style="color: #e74c3c; font-size: 1.2em;">$${newPrice}</span></p>
        <p><a href="${productUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Deal</a></p>
        <hr style="margin: 20px 0;">
        <p style="font-size: 0.9em; color: #7f8c8d;">
          To stop receiving these alerts, reply with "UNSUBSCRIBE"<br>
          This email was sent by DealPop Price Alerts
        </p>
      </div>
    `,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@dealpop.com>',
      'X-Mailer': 'DealPop-Price-Alerts',
      'X-Priority': '3'
    }
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${userEmail}`);
  } catch (err) {
    console.error("Error sending email:", err.response?.body || err.message);
  }
}

export { notifyUser };