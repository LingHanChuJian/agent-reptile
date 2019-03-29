import os
import csv

from setting import *
from utils.timeformat import get_upper_first2, get_yesterday_time2

class FlowCsv:
    def __init__(self):
        self.csv_file = open(self.get_path(), 'w', newline='', encoding='utf-8-sig')
        self.writer = csv.writer(self.csv_file)
        self.writer.writerow(CSV_HEADER)

    def get_path(self):
        name = FILE_NAME % (get_upper_first2(), get_yesterday_time2())
        return os.path.join('export', name)

    def writer_csv(self, dict_data):
        self.writer.writerow(dict_data)

    def close_csv(self):
        self.csv_file.close()