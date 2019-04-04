import json
import execjs

from setting import *
from utils.mail import Mail
from utils.request import LumRequest
from utils.timeformat import get_today_time, get_early_time, get_today_time2, get_early_time2
from utils.api import LUM_ZONE_CUSTOMER, CUSTOMER_PARAM, LUM_ZONE_BW, BW_PARAM, LUM_ZONE_LIBS, LUM_CUSTOMER_INFO, INFO_PARAM


def dispose():
    request = LumRequest()
    BW_PARAM['from'] = get_early_time()
    BW_PARAM['to'] = get_today_time()
    bw = request.get_lum_data(LUM_ZONE_BW, BW_PARAM)
    customer = request.get_lum_data(LUM_ZONE_CUSTOMER, CUSTOMER_PARAM)
    billing = request.get_lum_data(LUM_CUSTOMER_INFO, INFO_PARAM)
    libs = request.get_lum_data(LUM_ZONE_LIBS)
    billing = json.loads(billing)
    customer = json.loads(customer)
    bw = json.loads(bw)
    # date_range = {'from': get_early_time(), 'to': get_today_time2()}
    date_range2 = {'from': get_early_time2(), 'to': get_today_time2()}
    content = read_file('flow.js')
    ctx = execjs.compile(content)
    res = ctx.call("billing", customer, bw, billing, date_range2, libs)
    # res = ctx.call("calculate_zone_usage", customer, date_range, bw, libs)


def read_file(path, code='utf-8'):
    with open(path, 'r', encoding=code) as f:
        file_content = f.read()
        f.close()
    return file_content


def test():
    mail = Mail()
    mail.send_content_mail('你好世界', '测试', MAIL_TEST)
    # path = 'C:\\Users\\27390\\Desktop\\agent-reptile\\export\\Flow_2019_02_01_2019_03_28.csv'
    # mail.send_file_mail('上个月的流量报表', '流量报表', path, MAIL_TEST)
    mail.close()


if __name__ == '__main__':
    test()
