import web_webview from '@ohos.web.webview';
import hello from 'libhello.so';

@Entry
@Component
struct Index {
  @State message: string = 'Server Starting...';
  webviewController: web_webview.WebviewController = new web_webview.WebviewController();

  private serverPort: number = 10235;
  private localUrl: string = `http://127.0.0.1:${this.serverPort}/index.html`;

  aboutToAppear() {
    try {
      console.info(`[ArkTS] Attempting to start server on port ${this.serverPort}`);

      hello.server(this.serverPort);
      
      this.message = 'Server Started';
      console.info('[ArkTS] Server start command executed.');
    } catch (e) {
      console.error(`[ArkTS] Failed to start server: ${e.message}`);
      this.message = 'Server Failed';
    }
  }

  build() {
    RelativeContainer() {
      Web({
        src: this.localUrl,
        controller: this.webviewController
      })
        .id('WebView')
        .height('100%')
        .width('100%')
        .alignRules({
          center: { anchor: '__container__', align: VerticalAlign.Center },
          middle: { anchor: '__container__', align: HorizontalAlign.Center }
        })
        .onPageBegin((event) => {
          console.info(`[Web] Loading: ${event.url}`);
        })
        .onErrorReceive((event) => {
          console.info(`[Web] Error: ${event.error.getErrorInfo()}`);
        })
    }
    .height('100%')
    .width('100%')
  }
}
