import http.server
import socketserver

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # ========== 保留你原有的2个跨源隔离头 ==========
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        
        # ========== 新增：解决跨域的核心CORS响应头【关键修复】 ==========
        self.send_header("Access-Control-Allow-Origin", "*")          # 允许所有来源访问
        self.send_header("Access-Control-Allow-Methods", "*")         # 允许所有请求方法(GET/POST等)
        self.send_header("Access-Control-Allow-Headers", "*")         # 允许所有请求头
        
        # 执行父类的结束响应头逻辑
        super().end_headers()

    # ========== 新增：必须实现OPTIONS方法【关键修复】 ==========
    # 浏览器发起跨域请求前，会先发OPTIONS预检请求，确认服务器是否允许跨域
    # 必须返回200状态码，否则预检失败，跨域请求直接被拦截
    def do_OPTIONS(self):
        self.send_response(200)  # 预检请求返回成功状态码
        self.end_headers()       # 调用上面的end_headers，自动带上所有跨域头

if __name__ == "__main__":
    HOST, PORT = "0.0.0.0", 8080
    
    # ========== 新增：开启地址复用，解决重启服务器端口占用问题 ==========
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer((HOST, PORT), CustomHandler) as httpd:
        print(f"服务器已启动，监听地址：http://{HOST}:{PORT}")
        print(f"✅ 局域网可访问地址：http://你的本机局域网IP:{PORT}")
        print("按 Ctrl+C 停止服务器")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            httpd.shutdown()
            print("\n服务器已停止")