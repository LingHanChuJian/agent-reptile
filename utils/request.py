import hashlib
import requests

from setting import MD5
from utils.timeformat import get_cur_time
from utils.api import GET_HEADER, POST_HEADER, LUM_CHECK_LOGIN


class LumRequest:

    def __init__(self):
        self.session = requests.Session()

    def set_cookie(self, cookie):
        jar = requests.cookies.RequestsCookieJar()
        for item in cookie:
            jar.set(item['name'], item['value'], domain=item['domain'])
        self.session.cookies.update(jar)

    def get_lum_data(self, url, param=None):
        response = self.session.get(url=url, headers=GET_HEADER, params=param, timeout=20)
        response.encoding = 'utf-8'
        return response

    def post_lum_data(self, url, data=None):
        response = self.session.post(url=url, data=data, headers=POST_HEADER, timeout=20)
        response.encoding = 'utf-8'
        return response

    def post_back_data(self, url, data=None):
        if data:
            time = get_cur_time()
            data['sign_time'] = time
            data['sign'] = self.md5(MD5 % time)
        response = requests.post(url=url, data=data)
        response.encoding = 'utf-8'
        return response

    def md5(self, string):
        m = hashlib.md5()
        m.update(string.encode('utf-8'))
        return m.hexdigest()

    def check_login(self):
        response = self.get_lum_data(LUM_CHECK_LOGIN)
        if response.status_code == 200:
            data = response.json()
            if data['user']['displayName']:
                return True
            else:
                return False
        else:
            return False
