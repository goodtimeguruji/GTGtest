import nodemailer from "nodemailer";

export const sendContactUsEmail = async (req, res) => {
    try {
        const { fullName, email, phone, message } = req.body;

        if (!fullName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email and message are required",
            });
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.hostinger.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const html = `
      <h2>New Contact Us Request</h2>

      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "-"}</p>

      <hr>

      <h3>Customer Message</h3>
      <p>${message}</p>
    `;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: "support@goodtimeguruji.in",
            replyTo: email, // support can reply directly to customer
            subject: `Contact Us Request from ${fullName}`,
            html,
        });
        try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "We have received your request",
                    html: `
                            <p>Dear ${fullName},</p>

                            <p>Thank you for contacting Good Time Guruji.</p>

                            <p>
                            Our support team has received your request and will get back to you shortly.
                            </p>

                            <p>
                            For your reference, we have received the following message:
                            </p>

                            <blockquote>
                            ${message}
                            </blockquote>

                            <br>

                            <p>
                            Regards,<br>
                            Good Time Guruji Team
                            </p>
                        `,
                });
        }
        catch (err) {
            console.error("Customer email failed:", err);
        }
        return res.json({
            success: true,
            message: "Message sent successfully",
        });

    } catch (error) {
        console.error("Contact Email Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send message",
        });
    }
};