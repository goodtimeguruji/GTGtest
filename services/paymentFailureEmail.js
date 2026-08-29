import nodemailer from "nodemailer";

export const notifyPaymentApiFailure = async (req, res) => {
  try {

    // Customer details from JWT
    const email = req.user?.email;
    const name = req.user?.name || "Customer";

    // Data from frontend
    const {
      razorpay_payment_id,
      razorpay_order_id,

      service,
      location,
      lat,
      lon,
      timezone,

      nakshatra,
      rasi,

      fromDate,
      toDate
    } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // =========================
    // SUPPORT EMAIL
    // =========================

    const supportHtml = `
      <h2>URGENT - Payment Successful but Muhurat API Failed</h2>

      <h3>Customer Details</h3>

      <p>
        <strong>Name:</strong> ${name}<br>
        <strong>Email:</strong> ${email}
      </p>

      <h3>Payment Details</h3>

      <p>
        <strong>Order ID:</strong> ${razorpay_order_id}<br>
        <strong>Payment ID:</strong> ${razorpay_payment_id}
      </p>

      <h3>Muhurat Request Details</h3>

      <p>
        <strong>Service:</strong> ${service}<br>
        <strong>Location:</strong> ${location}<br>
        <strong>Latitude:</strong> ${lat}<br>
        <strong>Longitude:</strong> ${lon}<br>
        <strong>Timezone:</strong> ${timezone}<br>
        <strong>Nakshatra:</strong> ${nakshatra}<br>
        <strong>Rasi:</strong> ${rasi}<br>
        <strong>From Date:</strong> ${fromDate}<br>
        <strong>To Date:</strong> ${toDate}
      </p>

      <p>
        Payment was captured successfully but Muhurat generation failed.
      </p>

      <p>
        Please manually process the request or initiate a refund.
      </p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "support@goodtimeguruji.in",
      subject: "URGENT - Payment Successful but Muhurat API Failed",
      html: supportHtml,
    });

    // =========================
    // CUSTOMER EMAIL
    // =========================

    const customerHtml = `
      <p>Dear ${name},</p>

      <p>
        We have successfully received your payment.
      </p>

      <p>
        Due to a temporary technical issue,
        we were unable to generate your Muhurat report immediately.
      </p>

      <h3>Your Request Details</h3>

      <p>
        <strong>Order ID:</strong> ${razorpay_order_id}<br>
        <strong>Payment ID:</strong> ${razorpay_payment_id}<br>
        <strong>Service:</strong> ${service}<br>
        <strong>Location:</strong> ${location}<br>
        <strong>Nakshatra:</strong> ${nakshatra}<br>
        <strong>Rasi:</strong> ${rasi}<br>
        <strong>Date Range:</strong> ${fromDate} to ${toDate}
      </p>

      <p>
        Our team has already been notified and will manually process your request.
      </p>

      <p>
        The Muhurat report will be sent directly to your registered email address.
      </p>

      <p>
        If you do not receive the report within 1–2 business days,
        a refund will be initiated to your original payment method.
      </p>

      <p>
        For assistance contact:
        support@goodtimeguruji.in
      </p>

      <p>
        Regards,<br>
        Good Time Guruji Team
      </p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Payment Received - Muhurat Report Processing",
      html: customerHtml,
    });

    return res.json({
      success: true,
      message: "Notification emails sent successfully",
    });

  } catch (error) {
    console.error("Payment Failure Email Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }
};