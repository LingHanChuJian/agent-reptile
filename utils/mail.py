import os
import smtplib
from email.header import Header
from email.utils import formataddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from setting import *


class Mail:
    def __init__(self):
        self.server = smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT)
        self.server.login(MAIL_ACCOUNT, MAIL_PASSWORD)

    def send_content_mail(self, text, title, mail_list):
        msg = MIMEText(text, 'plain', 'utf-8')
        msg['From'] = formataddr(['凌寒初见', MAIL_ACCOUNT])
        msg['To'] = formataddr(['quickbuy', ','.join(mail_list)])
        msg['Subject'] = Header(title, 'utf-8')
        self.server.sendmail(MAIL_ACCOUNT, mail_list, msg.as_string())

    def send_file_mail(self, text, title, file_path, mail_list):
        msg = MIMEMultipart()
        msg['From'] = formataddr(['凌寒初见', MAIL_ACCOUNT])
        msg['To'] = formataddr(['流量数据报表', ','.join(mail_list)])
        msg['Subject'] = Header(title, 'utf-8')
        msg.attach(MIMEText(text, 'plain', 'utf-8'))
        # 构建附件
        with open(file_path, 'rb') as f:
            enclosure = MIMEText(f.read(), 'base64', 'utf-8')
            enclosure.add_header('Content-Disposition', 'application/octet-stream')
            enclosure.add_header('Content-Disposition', 'attachment', filename=self.get_file_name(file_path))
            f.close()
            msg.attach(enclosure)
            self.server.sendmail(MAIL_ACCOUNT, mail_list, msg.as_string())

    def get_file_name(self, file_path):
        return os.path.basename(file_path)

    def close(self):
        self.server.quit()
