## agent-reptile
>luminati 统计流量

由于 luminati 暂时没有提供 各个端口流量使用情况的 api , 所以不想每次都去查看 流量使用了多少。

![lum](https://github.com/LingHanChuJian/agent-reptile/blob/master/img/lum.png)

## 功能

1. 每天早上8点, 计算lum端口每日流量使用情况

2. 每20分钟, 查询一次 余额 情况 小于 50 美刀 向管理者发送邮件

3. 每月1号， 统计一次上个月端口以及流量使用情况生成csv文件, 并向管理者发送邮件

4. 如果发生错误也会向管理员发送邮件提示， 需要检修

## 使用方法

1. 更改 setting_template.py 为 setting.py

2. 填写 setting.py 里面的默认参数

3. 本项目采用 pipenv 作为 python 虚拟环境和依赖管理工具

4. 执行以下命令,运行本项目

```
pipenv install
pipenv shell
python run.py
```

5. 喝一杯咖啡, 静静的享受项目带来的快乐
