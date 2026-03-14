"""
Notification system - WhatsApp + Email
"""

import os
from dotenv import load_dotenv

load_dotenv()

def send_whatsapp(message: str, to_number: str = None) -> bool:
    """Send WhatsApp message via Twilio."""
    try:
        from twilio.rest import Client
    except ImportError:
        print("Twilio not installed. Run: pip install twilio")
        return False

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_NUMBER")
    to_number = to_number or os.getenv("DEFAULT_NOTIFY_NUMBER")

    if not account_sid or account_sid == "your_account_sid_here":
        print("Twilio credentials not configured - skipping WhatsApp")
        return False

    client = Client(account_sid, auth_token)

    try:
        # Try sending as regular message first
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        print(f"WhatsApp sent: {msg.sid}")
        return True
    except Exception as e:
        print(f"WhatsApp error: {e}")
        return send_email("AI Agent Notification", message)

def send_whatsapp_template(to_number: str = None, template_vars: dict = None) -> bool:
    """Send WhatsApp using a template."""
    try:
        from twilio.rest import Client
    except ImportError:
        return False

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_NUMBER")
    to_number = to_number or os.getenv("DEFAULT_NOTIFY_NUMBER")

    if not account_sid:
        return False

    client = Client(account_sid, auth_token)

    # Default template - you'll need to configure your own content_sid
    content_sid = os.getenv("TWILIO_CONTENT_SID", "HXb5b62575e6e4ff6129ad7c8efe1f983e")

    try:
        msg = client.messages.create(
            from_=from_number,
            content_sid=content_sid,
            content_variables=str(template_vars or {}),
            to=to_number
        )
        print(f"WhatsApp template sent: {msg.sid}")
        return True
    except Exception as e:
        print(f"WhatsApp template error: {e}")
        return False

def send_email(subject: str, body: str) -> bool:
    """Send email notification as fallback."""
    import smtplib
    from email.mime.text import MIMEText

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not smtp_host or not smtp_user or smtp_user == "":
        print("Email not configured - skipping")
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = smtp_user

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print("Email sent")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False

def notify_user(message: str) -> bool:
    """Notify via WhatsApp, fallback to email."""
    if send_whatsapp(message):
        return True
    return send_email("AI Agent Notification", message)

if __name__ == "__main__":
    # Test
    print("Testing notification...")
    notify_user("Hello from AI Agent Team!")