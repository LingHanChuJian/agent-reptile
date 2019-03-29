import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils.api import LUM_DOMAIN
from setting import EXECUTABLE_PATH, USER_NAME, PASSWORD


class Driver:
    def __init__(self):
        chrome_options = webdriver.ChromeOptions()
        prefs = {"profile.managed_default_content_settings.images": 2}
        chrome_options.add_experimental_option("prefs", prefs)
        chrome_options.add_argument('--headless')
        self.driver = webdriver.Chrome(executable_path=EXECUTABLE_PATH, chrome_options=chrome_options)

    def login(self):
        self.driver.get(LUM_DOMAIN)
        self.driver.find_element_by_xpath('//li[@class="login_btn"]/a[@role="button"]').click()
        login_event = (By.XPATH, '//form[@id="signup_form"]')
        WebDriverWait(self.driver, 20, 0.1).until(EC.presence_of_element_located(login_event))
        self.driver.find_element_by_id('email').send_keys(USER_NAME)
        time.sleep(2)
        self.driver.find_element_by_id('password').send_keys(PASSWORD)
        time.sleep(2)
        self.driver.find_element_by_xpath('//button[contains(@class, "signup")]').click()
        dropdown_event = (By.XPATH, '//div[@data-toggle="dropdown"]')
        WebDriverWait(self.driver, 20, 0.1).until(EC.presence_of_element_located(dropdown_event))

    def get_cookie(self):
        return self.driver.get_cookies()
