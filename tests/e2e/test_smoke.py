import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


def test_open_and_close_chrome():
    print("\n=== RUNNING UPDATED SMOKE TEST v3 (ABOUT:BLANK) ===")

    options = Options()
    options.add_argument("--window-size=1400,900")
    options.add_argument("--start-maximized")

    # Force direct/no-proxy
    options.add_argument("--no-proxy-server")
    options.add_argument("--proxy-server=direct://")
    options.add_argument("--proxy-bypass-list=*")

    # Use Selenium Manager (built-in). Removes webdriver-manager as a variable.
    driver = webdriver.Chrome(options=options)

    driver.get("about:blank")
    print("Current URL after about:blank:", driver.current_url)

    driver.execute_script("document.title='Smoke'; document.body.innerHTML='<h1>ok</h1>';")
    print("Title after JS:", driver.title)

    assert driver.title == "Smoke"

    time.sleep(2)
    driver.quit()
