import os
import schedule
from ast import literal_eval

from setting import *
from utils.api import *
from utils.timeformat import *


from utils.mail import Mail
from utils.csv import FlowCsv
from utils.driver import Driver
from utils.request import LumRequest
from utils.dispose import LumDispose


class Run:
    def __init__(self):
        self.customer_name = ''
        self.request = LumRequest()
        if not self.is_file():
            cookie = self.save_cookie()
        else:
            cookie = self.open_cookie()
        if type(cookie) == str:
            cookie = literal_eval(cookie)
        self.request.set_cookie(cookie)
        if not self.request.check_login():
            self.request.set_cookie(self.save_cookie())
        self.query_balance_action()
        self.query_flow_action()

    def is_check_cookie(self):
        self.request.check_login()

    def is_file(self):
        return os.path.exists(COOKIE_PATH)

    def save_cookie(self):
        driver = Driver()
        driver.login()
        cookie = driver.get_cookie()
        with open(COOKIE_PATH, 'w', encoding='utf-8') as f:
            f.write(str(cookie))
            f.close()
        return cookie

    def open_cookie(self):
        return self.read_file(COOKIE_PATH)

    def read_file(self, path, code='utf-8'):
        with open(path, 'r', encoding=code) as f:
            file_content = f.read()
            f.close()
        return file_content

    def get_customer_name(self):
        if not self.customer_name:
            response = self.request.get_lum_data(LUM_CUSTOMER_LIST, CUSTOMER_NAME_PARAM)
            response = self.request_manage(response, 'get_customer_name request failed')
            data = response.json()
            for item in data:
                if 'customer_name' in data[item]:
                    self.customer_name = data[item]['customer_name']
        return self.customer_name

    def get_bw(self, date_range):
        for item in date_range:
            BW_PARAM[item] = date_range[item]
        BW_PARAM['customer'] = self.get_customer_name()
        response = self.request.get_lum_data(LUM_ZONE_BW, BW_PARAM)
        response = self.request_manage(response, 'get_bw request failed')
        return response.json()

    def get_libs(self):
        response = self.request.get_lum_data(LUM_ZONE_LIBS)
        response = self.request_manage(response, 'get_libs request failed')
        return response.text

    def get_billing(self):
        INFO_PARAM['customer'] = self.get_customer_name()
        response = self.request.get_lum_data(LUM_CUSTOMER_INFO, INFO_PARAM)
        response = self.request_manage(response, 'get_billing request failed')
        return response.json()

    def get_customer(self):
        CUSTOMER_PARAM['customer_name'] = self.get_customer_name()
        response = self.request.get_lum_data(LUM_ZONE_CUSTOMER, CUSTOMER_PARAM)
        response = self.request_manage(response, 'get_customer request failed')
        return response.json()

    def request_manage(self, response, describe):
        if response.status_code == 200:
            return response
        else:
            raise Exception('%s request failed' % describe, response.status_code)

    def compute_flow(self):
        if is_time_early():
            first_range = {'from': get_upper_first(), 'to': get_yesterday_time()}
            last_range = {'from': get_upper_first(), 'to': get_today_time()}
        else:
            first_range = {'from': get_early_time(), 'to': get_yesterday_time()}
            last_range = {'from': get_early_time(), 'to': get_today_time()}
        try:
            first_response = self.get_bw(first_range)
            last_response = self.get_bw(last_range)
            customer = self.get_customer()
            libs = self.get_libs()
            dispose = LumDispose(customer, libs)
            first_bw = dispose.dispose_flow(first_response, first_range)
            last_bw = dispose.dispose_flow(last_response, last_range)
            self.make_flow_report(first_bw)
            compute_bw = {}
            for item in first_bw['zones']:
                compute_bw[item] = \
                    self.conversion(self.get_value(last_bw['zones'][item]) - self.get_value(first_bw['zones'][item]))
            return compute_bw
        except:
            if IS_FAIL:
                mail = Mail()
                mail.send_content_mail(FAIL_MSG2 % '每日流量', FAIL_TITLE_MSG, MAIL_FLOW_SEND)
                mail.send_content_mail(FAIL_MSG % 'compute_flow', FAIL_TITLE_MSG, MAIL_TEST)
                mail.close()

    def get_value(self, value):
        if value and len(value) > 0:
            return value[0]
        else:
            raise Exception('get_value failed', value)

    def conversion(self, value):
        return '%.3f' % (value/(1000*1000*1000))

    def query_balance(self):
        range = {'from': get_early_time2(), 'to': get_today_time2()}
        bw_range = {'from': get_early_time(), 'to': get_today_time()}
        try:
            bw = self.get_bw(bw_range)
            customer = self.get_customer()
            libs = self.get_libs()
            billing = self.get_billing()
            dispose = LumDispose(customer, libs)
            balance = dispose.dispose_balance(bw, billing, range)
            if balance['calc_balance'] < 50:
                mail = Mail()
                mail.send_content_mail(FLOW_MSG % balance['calc_balance'], MAIL_BALANCE_SEND)
                mail.close()
        except:
            if IS_FAIL:
                mail = Mail()
                mail.send_content_mail(FAIL_MSG % 'query_balance', FAIL_TITLE_MSG, MAIL_TEST)
                mail.close()

    def make_flow_report(self, first_bw):
        if not is_time_early():
            return None
        csv = FlowCsv()
        for item in first_bw['zones']:
            csv.writer_csv([item, self.conversion(self.get_value(first_bw['zones'][item]))])
        csv.close_csv()
        mail = Mail()
        mail.send_file_mail(REPROT_MSG, REPROT_TITLE_MSG, csv.get_path(), MAIL_REPORT_SEND)
        mail.close()

    def query_flow_action(self):
        """
        每天早上八点定时 查询流量
        """
        schedule.every().day.at("08:00").do(self.compute_flow())

    def query_balance_action(self):
        """
        每个小时查询一次 查询余额
        """
        schedule.every(10).minutes.do(self.query_balance())


if __name__ == '__main__':
    Run()