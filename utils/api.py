# domain 主站
LUM_DOMAIN = 'https://luminati-china.co'

# get 请求
# 无参数
LUM_CHECK_LOGIN = '%s/users/get_user' % LUM_DOMAIN

# 参数 product = 'lum'
LUM_CUSTOMER_LIST = '%s/users/get_customers_list' % LUM_DOMAIN

# 参数 customer  实名名称
LUM_CUSTOMER_INFO = '%s/users/customer_info' % LUM_DOMAIN

# 参数 product='lum' customer_name 实名名称 和上面 customer 一致
LUM_ZONE_CUSTOMER = '%s/users/get_customer' % LUM_DOMAIN

# 参数 product='lum' customer 实名名称 from 和 to 都是时间参数 格式 %d-%b-%y parallel=true process_final=true
LUM_ZONE_BW = '%s/users/bw' % LUM_DOMAIN

# json 文本 无参数
LUM_ZONE_LIBS = '%s/customers_libs.json' % LUM_DOMAIN

# get 请求时 使用的请求头
GET_HEADER = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
    'Host': 'luminati-china.co',
    'Referer': 'https://luminati-china.co/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
}

# post 请求时 使用的请求头
POST_HEADER = {
    'Accept': 'text/plain, */*; q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Origin': 'luminati-china.co',
    'Referer': 'https://luminati-china.co/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Host': 'luminati-china.co',
    'Connection': 'keep-alive'
}

# 页面头部
PAGE_HEADER = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
    'Host': 'luminati-china.co',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
}


# 参数构造
CUSTOMER_NAME_PARAM = {
    'product': 'lum'
}

INFO_PARAM = {
    'customer': ''
}

CUSTOMER_PARAM = {
    'product': 'lum',
    'customer_name': ''
}

BW_PARAM = {
    'product': 'lum',
    'customer': '',
    'from': '',
    'to': '',
    'parallel': True,
    'process_final': True
}