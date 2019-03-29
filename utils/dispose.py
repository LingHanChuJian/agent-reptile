import execjs


class LumDispose:
    def __init__(self, customer_data, libs):
        self.customer = customer_data
        self.libs = libs
        self.ctx = execjs.compile(self.read_file('utils/flow.js'))

    def read_file(self, path, code='utf-8'):
        with open(path, 'r', encoding=code) as f:
            file_content = f.read()
            f.close()
        return file_content

    def dispose_flow(self, bw, date_range):
        return self.ctx.call("calculate_zone_usage", self.customer, date_range, bw, self.libs)

    def dispose_balance(self, bw, billing, date_range):
        return self.ctx.call("billing", self.customer, bw, billing, date_range, self.libs)
