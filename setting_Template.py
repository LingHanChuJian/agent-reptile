import os

BASH_DIR = os.path.dirname(os.path.abspath(__file__))

# 网站登陆的账号密码
USER_NAME = ''

PASSWORD = ''

# executable_path  chromedriver.exe 路径
EXECUTABLE_PATH = os.path.join(BASH_DIR, 'libs\chromedriver.exe')

COOKIE_PATH = os.path.join(BASH_DIR, 'cookie.txt')

FLOW_PATH = os.path.join(BASH_DIR, 'utils/flow.js')

# 邮箱
MAIL_SERVER = ''

MAIL_PORT = 465

MAIL_ACCOUNT = ''

# 授权码作为密码
MAIL_PASSWORD = ''

# 流量发信人列表
MAIL_FLOW_SEND = []

# 余额发信人列表 balance
MAIL_BALANCE_SEND = []

# 统计报表
MAIL_REPORT_SEND = []

# 测试邮件 发送列表
MAIL_TEST = []

# 生成文件名
FILE_NAME = 'Flow_%s_%s.csv'

# csv 头部
CSV_HEADER = ('端口', '流量/G')

# msg 描述
FLOW_MSG = '流量快用完了, 速度充值啊。剩余Money: %s 美刀'

REPROT_MSG = '上月报表,请查收!!!'

# 是否开启报错提醒
IS_FAIL = True

FAIL_MSG = '%s 查询失败, 尊敬的管理员大大, 敬爱的凌寒初见, 帮我检查下, 谢谢'

FAIL_MSG2 = '%s 查询失败, 今天请手动统计流量把!!!'

FAIL_TITLE_MSG = '查询失败'
