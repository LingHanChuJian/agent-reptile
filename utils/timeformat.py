import time
from datetime import datetime, timedelta, date


def get_standard_time(time):
    """
    将格式 %d-%b-%y 转换成  %d-%m-%y
    """
    t = datetime.strptime(time, '%d-%b-%Y')
    return t.strftime('%d-%m-%Y')


def get_standard_time2(time):
    """
    将格式 %d-%b-%y 转换成  %d-%m-%y
    """
    t = datetime.strptime(time, '%d-%b-%y')
    return t.strftime('%d-%m-%y')


def get_english_time(time):
    """
    将格式 %d-%m-%Y 转成 %d-%b-%Y
    """
    t = datetime.strptime(time, '%d-%m-%Y')
    return t.strftime('%d-%b-%Y')


def get_english_time2(time):
    """
    将格式 %d-%m-%y 转成 %d-%b-%y
    """
    t = datetime.strptime(time, '%d-%m-%y')
    return t.strftime('%d-%b-%y')


def get_today_time():
    """
    获取今天的日期 时间格式为 %d-%b-%y
    """
    t = time.localtime(time.time())
    return time.strftime('%d-%b-%y', t)


def get_early_time():
    """
    获取当月一号 时间格式为 %d-%b-%y
    """
    t = date.today().replace(day=1)
    return t.strftime('%d-%b-%y')


def get_yesterday_time():
    """
    获取昨天 时间格式为 %d-%b-%y
    """
    t = date.today() + timedelta(days=-1)
    return t.strftime('%d-%b-%y')


def get_today_time2():
    """
    获取今天早上  八点整 时间戳 13位
    """
    cur = time.localtime(time.time())
    t = time.mktime(time.strptime(time.strftime('%Y-%m-%d 08:00:00', cur), '%Y-%m-%d %H:%M:%S'))
    return t * 1000


def get_early_time2():
    """
    获取当月一号 早上八点时间戳 13位
    """
    cur = time.localtime(time.time())
    t = time.mktime(time.strptime(time.strftime('%Y-%m-01 08:00:00', cur), '%Y-%m-%d %H:%M:%S'))
    return t * 1000


def is_time_early():
    """
    判断是不是今天 当月一号
    """
    if datetime.now().day == 1:
        return True
    else:
        return False


def get_upper_first():
    """
    获取上个月 1号 %d-%b-%y
    """
    t = (date.today().replace(day=1) - timedelta(1)).replace(day=1)
    return t.strftime('%d-%b-%y')


def get_upper_first2():
    """
    获取上月 1号 %Y_%m_%d
    """
    t = (date.today().replace(day=1) - timedelta(1)).replace(day=1)
    return t.strftime('%Y_%m_%d')


def get_yesterday_time2():
    """
    获取昨天 时间格式为 %Y_%m_%d
    """
    t = date.today() + timedelta(days=-1)
    return t.strftime('%Y_%m_%d')